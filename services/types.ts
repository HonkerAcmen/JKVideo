export interface VideoItem {
  bvid: string;
  aid: number;
  title: string;
  pic: string;
  owner: {
    mid: number;
    name: string;
    face: string;
  };
  stat?: {
    view: number;
    danmaku: number;
    reply: number;
    like: number;
    coin: number;
    favorite: number;
  } | null;
  duration: number;
  desc: string;
  cid?: number;
  pages?: Array<{ cid: number; part: string }>;
  goto?: 'av' | 'live';
  roomid?: number;
  online?: number;
  area_name?: string;
  ugc_season?: {
    id: number;
    title: string;
    cover: string;
    ep_count: number;
    sections: Array<{
      episodes: Array<{
        aid: number;
        bvid: string;
        cid: number;
        title: string;
        arc?: { pic: string; stat?: { view: number } };
      }>;
    }>;
  };
}

export interface Comment {
  rpid: number;
  content: { message: string };
  member: {
    uname: string;
    avatar: string;
  };
  like: number;
  ctime: number;
  replies: Comment[] | null;
}

export interface DashSegmentBase {
  initialization: string;
  index_range: string;
}

export interface DashVideoItem {
  id: number;
  baseUrl: string;
  bandwidth: number;
  mimeType: string;
  codecs: string;
  width: number;
  height: number;
  stat:any;
  frameRate: string;
  segment_base?: DashSegmentBase;
  dolby_type?: number;  // 1=杜比视界
  hdr_type?: number;    // 1=HDR
}

export interface DashAudioItem {
  id: number;
  baseUrl: string;
  bandwidth: number;
  mimeType: string;
  codecs: string;
  segment_base?: DashSegmentBase;
}

export interface PlayUrlResponse {
  durl?: Array<{
    url: string;
    length: number;
    size: number;
  }>;
  dash?: {
    duration: number;
    video: DashVideoItem[];
    audio: DashAudioItem[];
  };
  dolby?: {
    type: number;          // 1=杜比全景声
    audio?: DashAudioItem[];
  };
  quality: number;
  accept_quality: number[];
  accept_description: string[];
}

export interface QRCodeInfo {
  url: string;
  qrcode_key: string;
}

export interface VideoShotData {
  img_x_len: number;
  img_y_len: number;
  img_x_size: number;
  img_y_size: number;
  image: string[];
  index: number[]; // frame index per second: index[t] = frame idx at second t
  pvdata?: string;
}

export interface DanmakuItem {
  time: number;       // 秒（float），弹幕出现时间
  mode: 1 | 4 | 5;   // 1=滚动, 4=底部固定, 5=顶部固定
  fontSize: number;
  color: number;      // 0xRRGGBB 十进制整数
  text: string;
  uname?: string;
  isAdmin?: boolean;
  guardLevel?: number;  // 0=无, 1=总督, 2=提督, 3=舰长
  medalLevel?: number;
  medalName?: string;
  timeline?: string;    // "2024-01-01 12:00:00" 直播弹幕时间戳
}

export interface LiveRoom {
  roomid: number;
  uid: number;
  title: string;
  uname: string;
  face: string;
  cover: string;
  online: number;
  area_name: string;
  parent_area_name: string;
}

export interface LiveRoomDetail {
  roomid: number;
  uid: number;
  title: string;
  description: string;
  live_status: number; // 1=直播中, 0=未开播
  online: number;
  area_name: string;
  parent_area_name: string;
  keyframe: string;
}

export interface LiveAnchorInfo {
  uid: number;
  uname: string;
  face: string;
}

export interface LiveStreamInfo {
  hlsUrl: string;
  flvUrl: string;
  qn: number;
  qualities: { qn: number; desc: string }[];
}

export interface FavoriteFolder {
  id: number;
  title: string;
  media_count: number;
  cover: string;
  intro?: string;
}

export interface FollowUser {
  mid: number;
  uname: string;
  face: string;
  sign?: string;
  mtime?: number;
}

export interface UserSpaceProfile {
  mid: number;
  name: string;
  face: string;
  sign: string;
  topPhoto: string;
  level: number;
  officialTitle: string;
  vipLabel: string;
  following: number;
  follower: number;
  archiveCount: number;
}
