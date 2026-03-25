<div align="center">

<img src="https://img.shields.io/badge/JKVideo-仿B站客户端-00AEEC?style=for-the-badge&logo=bilibili&logoColor=white" alt="JKVideo"/>

# JKVideo

**高颜值第三方 B 站 React Native 客户端**

*A feature-rich Bilibili-like app with DASH playback, real-time danmaku, WBI signing & live streaming*

---

[![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK_55-000020?logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-lightgrey)](README.md)

[English](README.en.md) · [快速开始](#快速开始) · [功能亮点](#功能亮点) · [贡献](CONTRIBUTING.md)

</div>

---

## 截图预览

<table>
  <tr>
    <td align="center"><img src="public/p1.jpg" width="180"/><br/><sub>首页热门 · 内联视频 · 穿插直播</sub></td>
    <td align="center"><img src="public/p2.jpg" width="180"/><br/><sub>视频详情 · 简介 · 推荐视频</sub></td>
    <td align="center"><img src="public/p3.jpg" width="180"/><br/><sub>竖屏播放 · 4K HDR · 多清晰度</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="public/p4.jpg" width="180"/><br/><sub>下载管理 · 局域网分享二维码</sub></td>
    <td align="center"><img src="public/p5.jpg" width="180"/><br/><sub>直播 Tab · 关注主播在线 · 分区筛选</sub></td>
    <td align="center"><img src="public/p6.jpg" width="180"/><br/><sub>直播详情 · 实时弹幕 · 舰长标记</sub></td>
  </tr>
</table>

## 演示视频

<https://github.com/tiajinsha/JKVideo/releases/download/v1.0.0/6490dcd9dba9a243a7cd8f00359cc285.mp4>

---

## 功能亮点

🎬 **DASH 完整播放**
Bilibili DASH 流 → `buildDashMpdUri()` 生成本地 MPD → ExoPlayer 原生解码，支持 1080P + 4K HDR杜比视界

💬 **完整弹幕系统**
视频弹幕 XML 时间轴同步 + 5 车道飘屏覆盖；直播弹幕 WebSocket 实时接收 + 舰长标记 + 礼物计数

🔐 **WBI 签名实现**
纯 TypeScript 手写 MD5，无任何外部加密依赖，nav 接口 12h 自动缓存

🏠 **智能首页排布**
BigVideoCard 内联 DASH 静音自动播放 + 水平手势快进 + 直播卡片穿插 + 双列混排

📺 **全局迷你播放器**
切换页面后底部浮层续播，VideoStore 跨组件状态同步

🔑 **扫码登录**
二维码生成 + 2s 轮询 + 响应头 Cookie 自动提取 SESSDATA

📥 **下载 + 局域网分享**
多清晰度后台下载，内置 HTTP 服务器生成局域网 QR 码，同 Wi-Fi 设备扫码直接播放

🌐 **跨平台运行**
Android · iOS · Web，Expo Go 扫码 5 分钟运行，Dev Build 解锁完整 DASH 播放

---

## 技术架构

| 层 | 技术 |
|---|---|
| 框架 | React Native 0.83 + Expo SDK 55 |
| 路由 | expo-router v4（文件系统路由，Stack 导航） |
| 状态管理 | Zustand |
| 网络请求 | Axios |
| 本地存储 | @react-native-async-storage/async-storage |
| 视频播放 | react-native-video（DASH MPD / HLS / MP4） |
| 降级播放 | react-native-webview（HTML5 video 注入） |
| 页面滑动 | react-native-pager-view |
| 图标 | @expo/vector-icons（Ionicons） |

---

## 快速开始

### 环境要求

- Node.js 20+
- pnpm 10+
- Android Studio（Android 开发 / 打包）
- Xcode（仅 iOS）

推荐先安装依赖：

```bash
git clone https://github.com/tiajinsha/JKVideo.git
cd JKVideo
pnpm install
```

### 方式一：Expo Go（快速预览）

> 仅适合快速看 UI，部分原生能力不可用，视频播放会降级

```bash
pnpm start
```

用 Expo Go App（[Android](https://expo.dev/go) / [iOS](https://expo.dev/go)）扫描二维码即可运行。

### 方式二：Dev Build（推荐，本项目主要开发方式）

> 支持原生播放器、完整弹幕、下载、局域网分享等能力

```bash
pnpm android   # Android Dev Build
pnpm ios       # iOS Dev Build（需 macOS + Xcode）
```

如果是第一次运行 Android，需要先准备：

1. 安装 Android Studio
2. 安装 Android SDK / Platform Tools / 模拟器镜像
3. 确认 `adb` 可用
4. 在项目中存在 `android/local.properties`

示例 `android/local.properties`：

```properties
sdk.dir=/Users/你的用户名/Library/Android/sdk
```

如果你使用 Android 模拟器：

```bash
emulator -list-avds
emulator -avd Pixel_9
adb devices
pnpm android
```

如果你使用 USB 真机：

```bash
adb devices
export ANDROID_SERIAL=你的设备序列号
pnpm android

 npx expo start --dev-client --host localhost    
```

### 方式三：Web 端

Web 端需要先启动本地代理，否则视频列表、直播列表和媒体资源会请求失败。

```bash
pnpm proxy
pnpm web
```

说明：

- 代理脚本是 [dev-proxy.js](/Users/feixue/Git_hub_Project/JKVideo/dev-proxy.js)
- 默认监听 `3001`
- Web 页面默认运行在 `8081`
- Web 端不支持局域网分享功能

### Android Release 打包（分发安装包）

#### 1. 生成签名文件

在 `android/app` 下生成正式 keystore：

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore jkvideo-release.keystore -alias jkvideo -keyalg RSA -keysize 2048 -validity 10000
```

生成后文件路径应为：

[android/app/jkvideo-release.keystore](/Users/feixue/Git_hub_Project/JKVideo/android/app/jkvideo-release.keystore)

#### 2. 配置签名信息

复制模板：

```bash
cp android/keystore.properties.example android/keystore.properties
```

然后编辑：

[android/keystore.properties](/Users/feixue/Git_hub_Project/JKVideo/android/keystore.properties)

内容示例：

```properties
storeFile=jkvideo-release.keystore
storePassword=你的store密码
keyAlias=jkvideo
keyPassword=你的key密码
```

注意：

- `storeFile` 必须写 `jkvideo-release.keystore`
- 不要写成 `app/jkvideo-release.keystore`

#### 3. 打 APK

```bash
pnpm android:apk
```

产物位置：

[android/app/build/outputs/apk/release/app-release.apk](/Users/feixue/Git_hub_Project/JKVideo/android/app/build/outputs/apk/release/app-release.apk)

#### 4. 打 AAB（上架商店）

```bash
pnpm android:aab
```

产物位置：

[android/app/build/outputs/bundle/release/app-release.aab](/Users/feixue/Git_hub_Project/JKVideo/android/app/build/outputs/bundle/release/app-release.aab)

#### 5. 关于 Sentry

本地 release 打包脚本已经默认禁用了 Sentry 自动上传 sourcemap：

- `pnpm android:apk`
- `pnpm android:aab`

这样可以避免本地打包时被 `sentry-cli` 阻塞。

### 直接安装（Android）

前往 [Releases](https://github.com/tiajinsha/JKVideo/releases/latest) 下载最新 APK，无需编译，安装即用。

> 需在 Android 设置中开启「安装未知来源应用」

---

## 项目结构

```
app/
  index.tsx            # 首页（PagerView 热门/直播 Tab）
  video/[bvid].tsx     # 视频详情（播放 + 简介/评论/弹幕）
  live/[roomId].tsx    # 直播详情（HLS 播放 + 实时弹幕）
  search.tsx           # 搜索页
  downloads.tsx        # 下载管理页
  settings.tsx         # 设置页（画质 + 退出登录）

components/            # UI 组件（播放器、弹幕、卡片等）
hooks/                 # 数据 Hooks（视频列表、播放流、弹幕等）
services/              # Bilibili API 封装（axios + Cookie 拦截）
store/                 # Zustand 状态（登录、下载、播放、设置）
utils/                 # 工具函数（格式化、图片代理、MPD 构建）
```

---

## 已知限制

| 限制 | 原因 |
|---|---|
| 4K / 1080P+ 需要大会员账号登录 | B 站 API 策略限制 |
| FLV 直播流不支持 | HTML5 / ExoPlayer 均不支持 FLV，已自动选 HLS |
| Web 端需本地代理 | B 站图片防盗链（Referer 限制） |
| 动态流 / 投稿 / 点赞 | 需要 `bili_jct` CSRF Token，暂未实现 |
| 二维码 10 分钟过期 | 关闭登录弹窗重新打开即可刷新 |

---

## 贡献

欢迎提交 Issue 和 PR！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 免责声明

本项目仅供个人学习研究使用，不得用于商业用途。
所有视频内容版权归原作者及哔哩哔哩所有。
本项目与哔哩哔哩官方无任何关联。

---

## License

[MIT](LICENSE) © 2026 JKVideo Contributors

---

<div align="center">

如果这个项目对你有帮助，欢迎点一个 ⭐ Star！

---

## 请作者喝杯咖啡 ☕

如果这个项目对你有所帮助，欢迎请作者喝杯咖啡，你的支持是持续开发的最大动力，感谢每一位愿意打赏的朋友！

<table>
  <tr>
    <td align="center">
      <img src="public/wxpay.jpg" width="180"/><br/>
      <sub>微信支付</sub>
    </td>
    <td align="center">
      <img src="public/alipay.jpg" width="180"/><br/>
      <sub>支付宝</sub>
    </td>
  </tr>
</table>

</div>
