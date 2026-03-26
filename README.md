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

1. 运行：

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

## iOS 运行说明

### 虚拟机或本机模拟器运行

适用于你自己的 macOS 环境或 macOS 虚拟机，直接在 iOS Simulator 中编译运行。

#### 环境检查

```bash
xcode-select -p
node -v
npm -v
```

#### 安装依赖

```bash
cd /Users/feixue/Git_hub_Project/JKVideo
npm install
```

#### 一键编译并启动 iOS 模拟器

```bash
npx expo run:ios
```

#### 先生成原生工程，再手动编译

```bash
npx expo prebuild -p ios
npx pod-install ios
open ios/JKVideo.xcworkspace
```

#### 指定模拟器型号运行

```bash
xcrun simctl list devices available
npx expo run:ios --simulator "iPhone 16"
```

#### 清理后重新编译

```bash
rm -rf ios/build
npx expo run:ios --clean
```

#### CocoaPods 缺失时

```bash
sudo gem install cocoapods
npx pod-install ios
```

### iOS 真机本地运行命令表

适用于你自己的 iPhone 本地调试。需要 macOS、Xcode、数据线，以及 Apple ID 登录 Xcode。

#### 1. 安装依赖

```bash
cd /Users/feixue/Git_hub_Project/JKVideo
npm install
```

#### 2. 生成 iOS 原生工程

```bash
npx expo prebuild -p ios
npx pod-install ios
```

#### 3. 查看本机可用设备

```bash
xcrun xctrace list devices
```

#### 4. 直接命令行安装到真机

```bash
npx expo run:ios --device
```

如果有多台设备，可按设备名指定：

```bash
npx expo run:ios --device "你的 iPhone 名称"
```

#### 5. 使用 Xcode 本地运行

```bash
open ios/JKVideo.xcworkspace
```

然后在 Xcode 中完成以下操作：

1. 选择你的 iPhone 作为运行目标。
2. 在 `Signing & Capabilities` 中选择你的 Team。
3. 首次运行时，如提示信任开发者证书，到手机中手动信任。
4. 点击 Xcode 的 Run 按钮安装并启动。

#### 6. 真机调试失败时常用命令

```bash
npx expo run:ios --device --clean
```

```bash
cd ios
pod install
cd ..
```

#### 7. 真机运行前建议检查

```bash
xcodebuild -version
xcrun devicectl list devices
```

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

## 致谢

感谢JKVideo原项目

## License

MIT
