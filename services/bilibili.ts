import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import pako from "pako";
import type {
  VideoItem,
  Comment,
  PlayUrlResponse,
  QRCodeInfo,
  VideoShotData,
  DanmakuItem,
  LiveRoom,
  LiveRoomDetail,
  LiveAnchorInfo,
  LiveStreamInfo,
  FavoriteFolder,
  FollowUser,
} from "./types";
import { signWbi } from "../utils/wbi";
import { parseDanmakuXml } from "../utils/danmaku";

const isWeb = Platform.OS === "web";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BASE = isWeb
  ? "http://localhost:3001/bilibili-api"
  : "https://api.bilibili.com";
const PASSPORT = isWeb
  ? "http://localhost:3001/bilibili-passport"
  : "https://passport.bilibili.com";
const COMMENT_BASE = isWeb
  ? "http://localhost:3001/bilibili-comment"
  : "https://comment.bilibili.com";

function generateBuvid3(): string {
  const h = () => Math.floor(Math.random() * 16).toString(16);
  const s = (n: number) => Array.from({ length: n }, h).join("");
  return `${s(8)}-${s(4)}-${s(4)}-${s(4)}-${s(12)}infoc`;
}

async function getBuvid3(): Promise<string> {
  let buvid3 = await AsyncStorage.getItem("buvid3");
  if (!buvid3) {
    buvid3 = generateBuvid3();
    await AsyncStorage.setItem("buvid3", buvid3);
  }
  return buvid3;
}

const api = axios.create({
  baseURL: BASE,
  timeout: 10000,
  headers: isWeb
    ? {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9",
      }
    : {
        "User-Agent": UA,
        Referer: "https://www.bilibili.com",
        Origin: "https://www.bilibili.com",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
});

api.interceptors.request.use(async (config) => {
  const [sessdata, buvid3] = await Promise.all([
    AsyncStorage.getItem("SESSDATA"),
    getBuvid3(),
  ]);
  if (isWeb) {
    // Browsers block Cookie/Referer/Origin headers; relay via custom headers to proxy
    if (buvid3) config.headers["X-Buvid3"] = buvid3;
    if (sessdata) config.headers["X-Sessdata"] = sessdata;
  } else {
    const cookies: string[] = [`buvid3=${buvid3}`];
    if (sessdata) cookies.push(`SESSDATA=${sessdata}`);
    config.headers["Cookie"] = cookies.join("; ");
  }
  return config;
});

// WBI key cache (rotates ~daily)
let wbiKeys: { imgKey: string; subKey: string } | null = null;
let wbiKeysTimestamp = 0;
const WBI_KEYS_TTL = 12 * 60 * 60 * 1000; // 12 hours

async function getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  if (wbiKeys && Date.now() - wbiKeysTimestamp < WBI_KEYS_TTL) return wbiKeys;
  try {
    const res = await api.get("/x/web-interface/nav");
    const wbiImg = res.data?.data?.wbi_img;
    if (!wbiImg?.img_url || !wbiImg?.sub_url) {
      if (wbiKeys) return wbiKeys; // fallback to stale cache
      throw new Error("Failed to get WBI keys: missing wbi_img data");
    }
    const extract = (url: string) =>
      url
        .split("/")
        .pop()!
        .replace(/\.\w+$/, "");
    wbiKeys = {
      imgKey: extract(wbiImg.img_url),
      subKey: extract(wbiImg.sub_url),
    };
    wbiKeysTimestamp = Date.now();
    return wbiKeys;
  } catch (e) {
    if (wbiKeys) return wbiKeys; // fallback to stale cache on network error
    throw e;
  }
}

export async function getRecommendFeed(freshIdx = 0): Promise<VideoItem[]> {
  const { imgKey, subKey } = await getWbiKeys();
  const signed = signWbi(
    {
      fresh_type: 3,
      fresh_idx: freshIdx,
      fresh_idx_1h: freshIdx,
      ps: 21,
      feed_version: "V8",
    },
    imgKey,
    subKey,
  );
  const res = await api.get("/x/web-interface/wbi/index/top/feed/rcmd", {
    params: signed,
  });
  const items: any[] = res.data.data?.item ?? [];
  return items
    .filter((item) => item.goto === "av" && item.bvid && item.title)
    .map(
      (item) =>
        ({
          ...item,
          aid: item.id ?? item.aid,
          pic: item.pic ?? item.cover,
          owner: item.owner ?? {
            mid: 0,
            name: item.owner_info?.name ?? "",
            face: item.owner_info?.face ?? "",
          },
        }) as VideoItem,
    );
}

export async function getPopularVideos(pn = 1): Promise<VideoItem[]> {
  const res = await api.get("/x/web-interface/popular", {
    params: { pn, ps: 20 },
  });
  return res.data.data.list as VideoItem[];
}

export async function getVideoDetail(bvid: string): Promise<VideoItem> {
  const res = await api.get("/x/web-interface/view", { params: { bvid } });
  return res.data.data as VideoItem;
}

export async function getPlayUrl(
  bvid: string,
  cid: number,
  qn = 64,
): Promise<PlayUrlResponse> {
  const isAndroid = Platform.OS === "android";
  // 1488 = 16(DASH)|64(HDR)|128(4K)|256(杜比全景声)|1024(杜比视界)
  const FNVAL_ANDROID = 16 | 64 | 128 | 256 | 1024;
  const params = isAndroid
    ? { bvid, cid, qn, fnval: FNVAL_ANDROID, fourk: 1 }
    : { bvid, cid, qn, fnval: 0, platform: "html5", fourk: 1 };
  const res = await api.get("/x/player/playurl", { params });
  return res.data.data as PlayUrlResponse;
}

export async function getPlayUrlForDownload(
  bvid: string,
  cid: number,
  qn = 64,
): Promise<string> {
  const res = await api.get("/x/player/playurl", {
    params: { bvid, cid, qn, fnval: 0, platform: "html5" },
  });
  if (res.data?.code !== 0) {
    throw new Error(
      `API ${res.data?.code}: ${res.data?.message ?? "请求失败"}`,
    );
  }
  const durlItem = res.data?.data?.durl?.[0];
  // 优先用主 URL，主 URL 失效时退到 backup_url
  const url: string | undefined =
    durlItem?.url || (durlItem?.backup_url as string[] | undefined)?.[0];
  if (!url) throw new Error("无法获取下载地址（durl 为空）");
  return url;
}

export async function getUserInfo(): Promise<{
  face: string;
  uname: string;
  mid: number;
}> {
  const res = await api.get("/x/web-interface/nav");
  const { face, uname, mid } = res.data.data;
  return { face: face ?? "", uname: uname ?? "", mid: mid ?? 0 };
}

export async function getComments(
  aid: number,
  cursor = "",
  sort = 2,
): Promise<{ replies: Comment[]; nextCursor: string; isEnd: boolean }> {
  const mode = sort === 2 ? 3 : 2; // 3=hot, 2=time
  const res = await api.get("/x/v2/reply/main", {
    params: {
      oid: aid,
      type: 1,
      mode,
      plat: 1,
      pagination_str: JSON.stringify({ offset: cursor }),
    },
  });
  const data = res.data.data;
  const replies = (data?.replies ?? []) as Comment[];
  const nextCursor: string = data?.cursor?.next ?? "";
  const isEnd: boolean = data?.cursor?.is_end ?? true;
  return { replies, nextCursor, isEnd };
}

export async function getVideoShot(
  bvid: string,
  cid: number,
): Promise<VideoShotData | null> {
  try {
    const res = await api.get("/x/player/videoshot", {
      params: { bvid, cid, index: 1 },
    });
    return res.data.data as VideoShotData;
  } catch {
    return null;
  }
}

export async function generateQRCode(): Promise<QRCodeInfo> {
  const headers = isWeb ? {} : { Referer: "https://www.bilibili.com" };
  const res = await axios.get(
    `${PASSPORT}/x/passport-login/web/qrcode/generate`,
    { headers },
  );
  return res.data.data as QRCodeInfo;
}

export async function pollQRCode(
  qrcode_key: string,
): Promise<{ code: number; cookie?: string }> {
  const headers = isWeb ? {} : { Referer: "https://www.bilibili.com" };
  const res = await axios.get(`${PASSPORT}/x/passport-login/web/qrcode/poll`, {
    params: { qrcode_key },
    headers,
  });
  const { code } = res.data.data;
  let cookie: string | undefined;
  if (code === 0) {
    if (isWeb) {
      // Proxy relays SESSDATA via custom response header
      cookie = res.headers["x-sessdata"] as string | undefined;
    } else {
      const setCookie = res.headers["set-cookie"];
      const match = setCookie?.find((c: string) => c.includes("SESSDATA="));
      if (match) {
        const sessPart = match
          .split(";")
          .find((p: string) => p.trim().startsWith("SESSDATA="));
        if (sessPart) {
          cookie = sessPart.trim().replace("SESSDATA=", "");
        }
      }
    }
  }
  return { code, cookie };
}

const LIVE_BASE = isWeb
  ? "http://localhost:3001/bilibili-live"
  : "https://api.live.bilibili.com";

export async function getLiveList(
  page = 1,
  parentAreaId = 0,
): Promise<LiveRoom[]> {
  if (parentAreaId === 0) {
    // 推荐：使用原有接口
    const res = await api.get(
      `${LIVE_BASE}/xlive/web-interface/v1/webMain/getMoreRecList`,
      {
        params: { platform: "web", page, page_size: 20 },
      },
    );
    const list: any[] = res.data.data?.recommend_room_list ?? [];
    return list.map((item) => ({
      roomid: item.roomid,
      uid: item.uid,
      title: item.title,
      uname: item.uname,
      face: item.face,
      cover: item.cover ?? item.user_cover ?? item.keyframe,
      online: item.online,
      area_name: item.area_v2_name ?? "",
      parent_area_name: item.area_v2_parent_name ?? "",
    }));
  }
  // 分区筛选：使用 getRoomList 接口
  const res = await api.get(`${LIVE_BASE}/room/v1/area/getRoomList`, {
    params: {
      parent_area_id: parentAreaId,
      area_id: 0,
      page,
      page_size: 20,
      sort_type: "online",
      platform: "web",
    },
  });
  const list: any[] = res.data.data ?? [];
  return list.map((item) => ({
    roomid: item.roomid,
    uid: item.uid,
    title: item.title,
    uname: item.uname,
    face: item.face,
    cover: item.cover ?? item.user_cover ?? item.keyframe,
    online: item.online,
    area_name: item.area_v2_name ?? item.areaName ?? "",
    parent_area_name: item.area_v2_parent_name ?? item.parentAreaName ?? "",
  }));
}

export async function getLiveRoomDetail(
  roomId: number,
): Promise<LiveRoomDetail> {
  const res = await api.get(`${LIVE_BASE}/room/v1/Room/get_info`, {
    params: { room_id: roomId },
  });
  return res.data.data as LiveRoomDetail;
}

export async function getLiveAnchorInfo(
  roomId: number,
): Promise<LiveAnchorInfo> {
  const res = await api.get(
    `${LIVE_BASE}/live_user/v1/UserInfo/get_anchor_in_room`,
    {
      params: { roomid: roomId },
    },
  );
  const info = res.data.data?.info ?? {};
  return {
    uid: info.uid,
    uname: info.uname,
    face: info.face,
  } as LiveAnchorInfo;
}

export async function getLiveStreamUrl(
  roomId: number,
  qn = 10000,
): Promise<LiveStreamInfo> {
  try {
    const res = await api.get(
      `${LIVE_BASE}/xlive/web-room/v2/index/getRoomPlayInfo`,
      {
        params: {
          room_id: roomId,
          protocol: "0,1",
          format: "0,1,2",
          codec: "0",
          qn,
          platform: "android",
        },
      },
    );
    const playurl = res.data?.data?.playurl_info?.playurl;
    const streams: any[] = playurl?.stream ?? [];
    const gQnDesc: any[] = playurl?.g_qn_desc ?? [];
    const qualities = gQnDesc.map((q: any) => ({
      qn: q.qn as number,
      desc: q.desc as string,
    }));

    let hlsUrl = "";
    let flvUrl = "";
    let currentQn = 0;

    const hlsStream = streams.find((s) => s.protocol_name === "http_hls");
    if (hlsStream) {
      const fmt =
        hlsStream.format?.find((f: any) => f.format_name === "fmp4") ??
        hlsStream.format?.[0];
      const codec =
        fmt?.codec?.find((c: any) => c.codec_name === "avc") ?? fmt?.codec?.[0];
      const urlInfo = codec?.url_info?.[0];
      if (urlInfo) {
        hlsUrl = urlInfo.host + codec.base_url + (urlInfo.extra ?? "");
        currentQn = codec.current_qn ?? 0;
      }
    }

    const flvStream = streams.find((s) => s.protocol_name === "http_stream");
    if (flvStream) {
      const fmt = flvStream.format?.[0];
      const codec =
        fmt?.codec?.find((c: any) => c.codec_name === "avc") ?? fmt?.codec?.[0];
      const urlInfo = codec?.url_info?.[0];
      if (urlInfo) {
        flvUrl = urlInfo.host + codec.base_url + (urlInfo.extra ?? "");
      }
    }

    return { hlsUrl, flvUrl, qn: currentQn, qualities };
  } catch {
    return { hlsUrl: "", flvUrl: "", qn: 0, qualities: [] };
  }
}

function parseDuration(s: string): number {
  const parts = s.split(":").map(Number);
  return parts.length === 2
    ? parts[0] * 60 + parts[1]
    : parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export async function searchVideos(
  keyword: string,
  page = 1,
): Promise<VideoItem[]> {
  const { imgKey, subKey } = await getWbiKeys();
  const signed = signWbi(
    { keyword, search_type: "video", page, page_size: 20 },
    imgKey,
    subKey,
  );
  const res = await api.get("/x/web-interface/wbi/search/type", {
    params: signed,
  });
  const results: any[] = res.data.data?.result ?? [];
  return results
    .filter((item: any) => item.bvid && item.title)
    .map(
      (item: any) =>
        ({
          bvid: item.bvid,
          aid: item.aid ?? 0,
          title: item.title.replace(/<[^>]+>/g, ""),
          pic: item.pic
            ? item.pic.startsWith("//")
              ? `https:${item.pic}`
              : item.pic
            : "",
          owner: { mid: item.mid ?? 0, name: item.author ?? "", face: "" },
          stat: {
            view: item.play ?? 0,
            danmaku: item.video_review ?? 0,
            reply: item.review ?? 0,
            like: 0,
            coin: 0,
            favorite: 0,
          },
          duration: item.duration ? parseDuration(item.duration) : 0,
          desc: item.description ?? "",
          cid: 0,
          pages: [],
          ugc_season: undefined,
        }) as VideoItem,
    );
}

export async function getLiveDanmakuHistory(roomId: number): Promise<{
  danmakus: DanmakuItem[];
  adminMsgs: string[];
}> {
  const res = await api.get(`${LIVE_BASE}/xlive/web-room/v1/dM/gethistory`, {
    params: { roomid: roomId },
  });

  const room: any[] = res.data?.data?.room ?? [];
  const admin: any[] = res.data?.data?.admin ?? [];
  const adminMsgs = admin.map((a: any) => a.text ?? "").filter(Boolean);
  console.log(adminMsgs, "adminMsgs");
  const danmakus = room.map((m: any) => ({
    time: 0,
    mode: 1 as const,
    fontSize: 25,
    color: m.text_color
      ? parseInt(m.text_color.replace("#", ""), 16)
      : 0xffffff,
    text: m.text ?? "",
    uname: m.nickname ?? m.uname,
    isAdmin: m.isadmin === 1,
    guardLevel: m.guard_level ?? 0,
    medalLevel:
      Array.isArray(m.medal) && m.medal.length > 0
        ? (m.medal[0] as number)
        : undefined,
    medalName:
      Array.isArray(m.medal) && m.medal.length > 1
        ? (m.medal[1] as string)
        : undefined,
    timeline: m.timeline as string | undefined,
  }));
  return { danmakus, adminMsgs };
}

export async function getDanmaku(cid: number): Promise<DanmakuItem[]> {
  try {
    if (isWeb) {
      // web 走代理，代理已解压，直接拿文本
      const res = await axios.get(`${COMMENT_BASE}/${cid}.xml`, {
        headers: {},
        responseType: "text",
      });
      return parseDanmakuXml(res.data);
    }

    // Native：arraybuffer + 逐一尝试解压（服务器强制压缩，无法避免）
    const res = await axios.get(`${COMMENT_BASE}/${cid}.xml`, {
      headers: { Referer: "https://www.bilibili.com", "User-Agent": UA },
      responseType: "arraybuffer",
    });

    const bytes = new Uint8Array(res.data as ArrayBuffer);
    let xmlText: string | undefined;

    // 依次尝试：inflate (gzip/zlib) → inflateRaw (raw deflate)
    for (const fn of [pako.inflate, pako.inflateRaw] as Array<
      (input: Uint8Array, opts: pako.InflateOptions) => string
    >) {
      try {
        xmlText = fn(bytes, { to: "string" });
        if (xmlText.includes("<d ")) break;
        xmlText = undefined;
      } catch {
        /* 继续尝试下一种 */
      }
    }

    if (!xmlText) {
      // 最后尝试当作明文
      xmlText = new TextDecoder("utf-8").decode(bytes);
    }

    return parseDanmakuXml(xmlText);
  } catch (e) {
    console.warn("getDanmaku failed:", e);
    return [];
  }
}

export async function getFollowedLiveRooms(): Promise<LiveRoom[]> {
  const res = await api.get(
    `${LIVE_BASE}/xlive/web-ucenter/v1/xfetter/FeedList`,
    {
      params: { page: 1, page_size: 10, platform: "web" },
    },
  );
  const list = res.data?.data?.list ?? [];
  return list.map((r: any) => ({
    roomid: r.room_id ?? r.roomid,
    uid: r.uid,
    title: r.title,
    uname: r.uname,
    face: r.face,
    cover: r.cover || r.keyframe || "",
    online: r.online ?? 0,
    area_name: r.area_v2_name ?? "",
    parent_area_name: r.area_v2_parent_name ?? "",
  }));
}

export async function getFavoriteFolders(
  upMid: number,
): Promise<FavoriteFolder[]> {
  const res = await api.get("/x/v3/fav/folder/created/list-all", {
    params: { up_mid: upMid },
  });
  const list: any[] = res.data?.data?.list ?? [];
  return list.map((f: any) => ({
    id: f.id ?? f.media_id ?? 0,
    title: f.title ?? "",
    media_count: f.media_count ?? 0,
    cover: f.cover ?? "",
    intro: f.intro ?? "",
  }));
}

export async function getFavoriteFolderVideos(
  mediaId: number,
  pn = 1,
  ps = 20,
): Promise<{ videos: VideoItem[]; hasMore: boolean }> {
  const res = await api.get("/x/v3/fav/resource/list", {
    params: { media_id: mediaId, pn, ps, platform: "web" },
  });
  const data = res.data?.data ?? {};
  const medias: any[] = data?.medias ?? [];
  const info = data?.info ?? {};
  const total = info?.media_count ?? medias.length;
  const hasMore = pn * ps < total;
  const videos = medias
    .filter((m) => m?.bvid && m?.title)
    .map(
      (m) =>
        ({
          bvid: m.bvid,
          aid: m.id ?? m.aid ?? 0,
          title: m.title ?? "",
          pic: m.cover ?? "",
          owner: {
            mid: m.upper?.mid ?? 0,
            name: m.upper?.name ?? "",
            face: "",
          },
          stat: {
            view: m.cnt_info?.play ?? 0,
            danmaku: m.cnt_info?.danmaku ?? 0,
            reply: m.cnt_info?.reply ?? 0,
            like: m.cnt_info?.like ?? 0,
            coin: m.cnt_info?.coin ?? 0,
            favorite: m.cnt_info?.collect ?? 0,
          },
          duration: m.duration ?? 0,
          desc: m.intro ?? "",
        }) as VideoItem,
    );
  return { videos, hasMore };
}

export async function getFollowings(
  vmid: number,
  pn = 1,
  ps = 30,
): Promise<{ users: FollowUser[]; hasMore: boolean }> {
  const res = await api.get("/x/relation/followings", {
    params: { vmid, pn, ps, order: "desc", order_type: "attention" },
  });
  const data = res.data?.data ?? {};
  const list: any[] = data?.list ?? [];
  const total = data?.total ?? list.length;
  const hasMore = pn * ps < total;
  const users = list.map((u: any) => ({
    mid: u.mid ?? 0,
    uname: u.uname ?? "",
    face: u.face ?? "",
    sign: u.sign ?? "",
    mtime: u.mtime ?? 0,
  }));
  return { users, hasMore };
}
