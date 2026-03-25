# JKVideo

一个基于 **React Native + Expo Router** 的第三方 B 站客户端，支持 Android / iOS / Web。

## 项目特点

- 视频播放：支持多清晰度、倍速、时间线、全屏（竖屏全屏 + 横屏全屏）。
- 手势控制：播放器支持多指手势（进入/退出全屏、弹幕开关等）。
- 互动能力：
  - 视频点赞/取消点赞
  - 评论发送
  - 评论点赞/取消点赞
- 登录与个人能力：
  - 扫码登录
  - 查看收藏夹
  - 查看关注列表
  - 关注 / 取关 UP 主
- 内容浏览：
  - 首页信息流
  - 直播列表与直播间
  - 视频详情（简介 / 评论 / 弹幕）
  - UP 主个人主页（背景图、元信息、投稿列表）
- 观看关系数据：
  - 关注页支持排序（最近观看、最晚观看、最早关注、最迟关注）
  - 进入 UP 页可按日期/播放量排序其视频

## 技术栈

- React Native 0.83
- Expo SDK 55
- Expo Router
- TypeScript
- Zustand
- Axios
- react-native-video

## 快速开始

```bash
git clone https://github.com/tiajinsha/JKVideo.git
cd JKVideo
pnpm install
```

## 常用命令

### 开发

```bash
pnpm start            # 启动 Expo 开发服务
pnpm android          # 运行 Android Dev Build
pnpm ios              # 运行 iOS Dev Build
pnpm web              # 运行 Web 版本
pnpm proxy            # 启动本地代理（Web 必需）
```

### 打包

```bash
pnpm android:apk      # 生成 Android APK
pnpm android:aab      # 生成 Android AAB
```

### 诊断与调试

```bash
pnpm -s tsc --noEmit  # TypeScript 类型检查
adb devices           # 查看 Android 设备
```

## Android 运行说明

### 真机运行

1. 开启手机开发者模式与 USB 调试。
2. 连接电脑后确认：

```bash
adb devices
```

3. 运行：

```bash
pnpm android
```

### 模拟器运行

```bash
emulator -list-avds
emulator -avd <你的AVD名>
pnpm android
```

> 如提示 SDK 路径问题，请配置 `android/local.properties`：
>
> ```properties
> sdk.dir=/Users/你的用户名/Library/Android/sdk
> ```

## Web 运行说明

Web 端依赖本地代理转发 B 站请求：

```bash
pnpm proxy
pnpm web
```

默认代理端口：`3001`

## 目录结构

```txt
app/          页面路由（首页、视频、直播、收藏、关注、我的等）
components/   通用组件（播放器、弹幕、卡片、Toast 等）
hooks/        业务 hooks（详情、评论、相关视频、下载等）
services/     B 站 API 封装
store/        Zustand 状态管理
utils/        工具函数（格式化、WBI、图片代理等）
```

## 已知注意事项

- Web 端必须先启动 `pnpm proxy`，否则部分接口会失败。
- 点赞/评论/关注等写操作依赖完整登录态（`SESSDATA + bili_jct` 等）。
- 当前仓库存在少量与下载相关的 TypeScript 历史报错，不影响你本次功能文档。

## License

MIT
