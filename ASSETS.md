# 参考与图片来源

## 页面参考

- 用户提供的 CHATCAT 网站截图：白色导航、猫咪大图、整齐照片网格。
- SPCA 待领养动物：https://www.spca.org.hk/zh-hant/adoption/animals-for-adoption/?sel_specie=3
- SPCA 猫咪领养与照顾：https://www.spca.org.hk/zh-hant/adoption/which-pet-is-for-you/which-pet-is-for-you-cats/

MeowHome 是独立的学生项目，不代表 SPCA，不同步其实际领养数据，也未复制其品牌标志、完整文案或动物档案。指南是简短的原创入门概述，提供外部参考链接。

- HKSCDA 首页：https://hkscda.com/ （仅参考图片优先布局、文字导航及悬停展示思路）

## 示例照片

照片下载为本地文件，用于首页及指南的配图；领养广场只显示用户自行发布的资料和上传照片。原有未使用照片保留在资源目录，不会自动生成猫咪档案。来源 Unsplash：

- `hero.jpg`：https://images.unsplash.com/photo-1495360010541-f48722b34f7d
- `milo.jpg`：https://images.unsplash.com/photo-1573865526739-10659fec78a5
- `luna.jpg`：https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba
- `mochi.jpg`：https://images.unsplash.com/photo-1511044568932-338cba0ad803
- `olive.jpg`：https://images.unsplash.com/photo-1533738363-b7f9aef128ce
- `cleo.jpg`：https://images.unsplash.com/photo-1518791841217-8f162f1e1131
- `pepper.jpg`：https://images.unsplash.com/photo-1494256997604-768d1f608cac
- `tofu.jpg`：https://images.unsplash.com/photo-1543852786-1cf6624b9987
- `maple.jpg`：https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13

标志与操作图标为项目内编写的 SVG。

## 新增卡片照片

以下 12 张照片来自 Unsplash 免费图片页面，作为独立虚构档案的示例插图，已保存到本地。

- `nori.jpg`：[图片页面](https://unsplash.com/photos/VlSJ25aoXMo) · [图片文件](https://images.unsplash.com/photo-1561389881-dac6bb97f175)
- `jasper.jpg`：[图片页面](https://unsplash.com/photos/mBRfYA0dYYE) · [图片文件](https://images.unsplash.com/photo-1583795128727-6ec3642408f8)
- `willow.jpg`：[图片页面](https://unsplash.com/photos/AGehl6k8xVo) · [图片文件](https://images.unsplash.com/photo-1585137173132-cf49e10ad27d)
- `oscar.jpg`：[图片页面](https://unsplash.com/photos/M7GJFakZObA) · [图片文件](https://images.unsplash.com/photo-1585435618194-4dffd09bd384)
- `poppy.jpg`：[图片页面](https://unsplash.com/photos/AfoQlAZ7hYk) · [图片文件](https://images.unsplash.com/photo-1644286424986-1036346f4098)
- `hazel.jpg`：[图片页面](https://unsplash.com/photos/8iZxUsJTFuY) · [图片文件](https://images.unsplash.com/photo-1754080687406-2b953a1534ae)
- `biscuit.jpg`：[图片页面](https://unsplash.com/photos/gmdJhvqa4Ho) · [图片文件](https://images.unsplash.com/photo-1569619543238-3c81d8ab78a8)
- `leo.jpg`：[图片页面](https://unsplash.com/photos/cWOzOnSoh6Q) · [图片文件](https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6)
- `ruby.jpg`：[图片页面](https://unsplash.com/photos/zlqZtlHTv3E) · [图片文件](https://images.unsplash.com/photo-1604675223954-b1aabd668078)
- `simba.jpg`：[图片页面](https://unsplash.com/photos/MvYCbFNKVxg) · [图片文件](https://images.unsplash.com/photo-1589872267076-a0859175685b)
- `misty.jpg`：[图片页面](https://unsplash.com/photos/niCN2DhTdlI) · [图片文件](https://images.unsplash.com/photo-1625060241508-22488e1e9264)
- `chestnut.jpg`：[图片页面](https://unsplash.com/photos/C-8TGAmhgPw) · [图片文件](https://images.unsplash.com/photo-1675504661658-33940d979a6a)

## 代码依赖

- Express：MIT License，安装信息与许可证随 npm 包提供；版本由 source/package-lock.json 锁定。
- SQLite 使用 Node.js 内置 node:sqlite，不使用 ORM。

## 新增真实摄影素材（2026-11-02）

10 张来自 Unsplash 摄影师原始页面的猫咪照片，存放在 `source/client/assets/sample-cats/`，用于手动上传练习发布及日记。最初 8 张发布于 2017–2019 年，后补布偶与金渐层照片发布于 2020、2025 年，未使用 AI 生成或改绘。摄影师、相机信息、原始链接和许可记录见 [照片来源说明](source/client/assets/sample-cats/SOURCES.md)。素材本身不会自动创建数据库记录；原开发电脑上另有通过正常发布流程建立的 10 条记录。

## 默认头像

`source/client/assets/images/default-avatar.png` 为用户提供的猫脸图片，保留原图与其中的 Depositphotos 水印，没有裁剪或去水印。界面现使用项目内原创矢量图 `source/client/assets/images/default-avatar.svg` 作为个人中心和送养者资料的默认头像；原 PNG 不再使用。

## 首页分区与动态效果参考

[Animal Defense League of Texas](https://adltexas.org/)：参考大图开场与连续内容分区的组织方式。MeowHome 使用原有猫咪摄影、配色与功能，滚动渐入、图片视差和流程展开由项目原生 JavaScript/CSS 实现，没有复制参考站的品牌、活动、统计数字或服务承诺。
