# reactBilibiliApp — 项目架构与技术要点

## 项目概述
仿 B 站 React Native 客户端，使用 Expo SDK 55 + expo-router，调用 Bilibili 官方 Web API 获取热门视频、视频详情、评论及扫码登录。

## 技术栈
| 层 | 技术 |
|---|---|
| 框架 | React Native 0.83 + Expo SDK 55 |
| 路由 | expo-router v4（文件系统路由） |
| 状态管理 | Zustand |
| 网络请求 | Axios |
| 本地存储 | @react-native-async-storage/async-storage |
| 视频播放 | react-native-webview（内嵌 HTML5 video） |
| 图标 | @expo/vector-icons（Ionicons） |

## 目录结构
```
app/
  _layout.tsx          # 根布局：Tab 导航 + 启动时恢复登录态
  index.tsx            # 首页：热门视频瀑布流（双列 FlatList）
  video/
    _layout.tsx        # Stack 导航（无头部）
    [bvid].tsx         # 视频详情页（播放 + 简介 + 评论）
components/
  VideoCard.tsx        # 视频卡片（封面、标题、UP主、播放量）
  VideoPlayer.tsx      # 视频播放器入口：web 用 <video>，native 用 NativeVideoPlayer
  NativeVideoPlayer.tsx# WebView 内嵌 HTML5 video 播放，用 JS 注入 src 避免 URL 特殊字符问题
  CommentItem.tsx      # 评论条目
  LoginModal.tsx       # 扫码登录 Modal（底部弹出）
hooks/
  useVideoList.ts      # 热门视频分页加载（支持下拉刷新、上拉加载更多）
  useVideoDetail.ts    # 视频详情 + 获取播放流 URL
  useComments.ts       # 评论分页加载
services/
  bilibili.ts          # 所有 API 请求（axios 实例 + Cookie 拦截器）
  types.ts             # 数据类型定义
store/
  authStore.ts         # Zustand 登录状态（sessdata/uid/username + 持久化）
utils/
  format.ts            # formatCount / formatDuration / formatTime
```

## 路由结构
- `/` → 首页（Tab）
- `/video/[bvid]` → 视频详情（Stack，从 Tab 内 push）
- `video` Tab 在导航栏中隐藏（`href: null`）

## Bilibili API 关键点

### axios 实例（services/bilibili.ts）
- 统一携带 `Referer: https://www.bilibili.com`、`User-Agent`（模拟 Chrome）
- 请求拦截器自动注入 Cookie：`buvid3`（随机生成并持久化）+ `SESSDATA`（登录后）

### 主要接口
| 函数 | 接口 | 说明 |
|---|---|---|
| `getPopularVideos(pn)` | `/x/web-interface/popular` | 热门视频，每页 20 条 |
| `getVideoDetail(bvid)` | `/x/web-interface/view` | 视频详情 |
| `getPlayUrl(bvid, cid)` | `/x/player/playurl` | 获取播放流 |
| `getComments(aid, pn)` | `/x/v2/reply` | 评论列表，sort=2（热评） |
| `generateQRCode()` | passport 域名 | 生成登录二维码 |
| `pollQRCode(key)` | passport 域名 | 轮询扫码状态（2s 间隔） |

### 播放流参数（重要）
```ts
params: { bvid, cid, qn: 64, fnval: 0, platform: 'html5' }
```
- `fnval: 0` + `platform: 'html5'` → 返回 **MP4** 格式（`durl[0].url`）
- `fnval: 1` → FLV，**不可用**（HTML5 video 不支持，WebView 无法播放）
- `fnval: 16` → DASH，结构不同（`dash` 字段，非 `durl`），需单独实现
- `qn: 64` = 720P，未登录时 B 站可能降级到较低清晰度

## 视频播放架构

```
VideoPlayer
  ├── web (Platform.OS === 'web') → 原生 <video> 标签
  └── native → NativeVideoPlayer (WebView)
               └── HTML 模板 + JS 注入 src
                   document.getElementById('v').src = JSON.stringify(uri)
```

**为什么用 WebView 而非 expo-av：**
- `expo-av` 需要 development build（native 编译），在 Expo Go 中报 `Cannot find native module 'ExponentAV'`
- `react-native-webview` 在 Expo Go 中开箱即用
- 用 `JSON.stringify(uri)` 注入 src，防止 URL 中 `&`、`=` 等特殊字符破坏 HTML 属性

## 登录流程
1. 首页右上角点击头像图标 → 弹出 `LoginModal`
2. 调用 `generateQRCode()` 获取 `qrcode_key` + 二维码 URL
3. 用 `https://api.qrserver.com` 渲染二维码图片（第三方服务）
4. 每 2s 轮询 `pollQRCode`，`code === 0` 时从响应 Header `set-cookie` 提取 `SESSDATA`
5. `useAuthStore.login()` 将 `SESSDATA` 写入 AsyncStorage 并更新 Zustand 状态
6. 下次启动时 `_layout.tsx` 调用 `restore()` 恢复登录态

## 主题色
- 主色：`#00AEEC`（B 站蓝）
- 文字主色：`#212121`
- 次要文字：`#999`
- 背景：`#f4f4f4`（列表）/ `#fff`（卡片）

## 开发注意事项

### 运行方式
- Expo Go：`expo start` 扫码，视频播放用 WebView 方案
- Dev Build：`expo run:android`，可使用更多 native 模块

### 常见问题
- **视频无法播放**：检查 `fnval` 是否为 `0`，确认返回的是 MP4 而非 FLV
- **API 403**：`buvid3` Cookie 或 `SESSDATA` 失效，清除 AsyncStorage 重试
- **评论为空**：B 站部分视频评论区关闭，`replies` 字段为 null 属正常
- **二维码过期**：`pollQRCode` 返回 `code === 86038`，关闭 Modal 重新打开即可

### 扩展方向
- 搜索功能：`/x/web-interface/search/all/v2`
- 动态流：需更高权限 Cookie（`bili_jct` CSRF Token）
- DASH 播放：需解析 MPD，配合支持 DASH 的播放器（如 `react-native-video` + dev build）
- 弹幕：`/x/v1/dm/list.so?oid={cid}` 返回 XML 格式
