# API 说明

同一 Express 服务提供页面和 `/api` 接口。输入输出使用 JSON；写操作需携带 `Content-Type: application/json` 和 `X-Requested-With: MeowHome`，前端由 `store.js` 统一设置。浏览器通过 cookie 发送 Session。

成功状态为 GET/PUT/PATCH/DELETE 的 200，创建的 201。错误返回 `{ "error": "原因" }`：400 无效输入；401 未登录或密码不正确；403 无权操作；404 记录不存在；409 状态冲突或重复数据；413 数据过大；415 请求类型不支持；429 过多登录失败；500 服务器错误。

## 账号

- `GET /api/auth/me`：返回当前用户 `{id,name,email}`，访客返回 `null`。不会返回密码哈希。
- `POST /api/auth/register`：输入 `{name,email,password}`，注册并登录，返回用户资料。姓名 2-60 字符、有效电邮、密码 8-128 字符；电邮忽略大小写且唯一。
- `POST /api/auth/login`：输入 `{email,password}`，返回资料并设置 cookie。每个 IP 在 15 分钟窗口内失败 20 次后会被限流，返回 429；计数保存在 SQLite，成功登录后清除。
- `POST /api/auth/logout`：输入 `{}`，删除当前 Session，返回 `{ok:true}`。
- `PATCH /api/profile`：登录用户输入 `{name,email}` 修改自己的资料，返回更新的用户。
- `PATCH /api/profile/password`：登录用户输入 `{currentPassword,newPassword}` 修改密码。新密码须为 8-128 字符，当前密码必须正确；新旧密码不能相同。成功返回 `{ok:true}`，不会注销当前 Session。
- `DELETE /api/profile`：输入 `{password}`。密码正确且没有核心关联记录才允许删除，返回 `{ok:true}`。

## 猫咪

- `GET /api/cats`：无查询参数时返回公开猫咪数组（供首页、个人中心等使用），包含 `ownerName`、状态和图片路径；不包含用户电邮。发现页可带 `q,breed,age,gender,location,sort,page,limit` 查询；SQL 先筛选/排序，再用 `LIMIT/OFFSET` 分页，返回 `{items,total,page,pageSize,pages}`。`age` 为 kitten/adult/senior，`sort` 为 newest/youngest/oldest/name，`page` 从 1 开始，`limit` 为 1-50（默认 6）；分页查询只返回 available 猫咪。
- `GET /api/cats/:id`：公开单只猫咪资料。
- `POST /api/cats`：登录用户发布，返回 `{id}`。输入字段为 `name,breed,months,gender,location,health,personality,energy,care,beginner,otherPets,description,requirements,image`。图片为 data URL；状态由服务器设为 `available`，ownerId 来自 Session。
- `PUT /api/cats/:id`：输入相同字段；只有主人且仍待领养时允许编辑。沿用图片时提交当前图片路径；更换照片后，未被其他记录引用的旧上传文件会被清理。
- `DELETE /api/cats/:id`：只有主人可删除无有效申请的待领养记录；关联的非有效申请、收藏按外键级联删除，未被其他记录引用的照片也会清理。

年龄为 1-360 整数月；性别 Male/Female；地区 Kowloon/Hong Kong Island/New Territories；性格 Gentle/Playful/Independent；活跃程度 calm/active；照护 easy/regular；beginner 和 otherPets 为布尔值。描述 30-1500 字符，领养要求 15-800 字符。品种使用发布表单选项。

## 申请

- `GET /api/applications`：只返回自己提交的申请及自己猫咪收到的申请。申请状态进入 contacting、accepted 或 completed 后，申请者会收到送养者联系电邮 `rehomerEmail`，以便自行联系；系统不会代发邮件。
- `POST /api/applications`：输入 `{catId,name,email,experience,home,reason}`，返回 `{id}`。不能申请自己的猫咪或重复申请。home、reason 为选填；留空或省略时保存为空字符串，填写时分别最多 1000、1500 字符。
- `PUT /api/applications/:id`：输入联系与居住资料；仅申请人、待处理/沟通中、且猫咪开放时可编辑。
- `PATCH /api/applications/:id/status`：输入 `{status}`。申请人可设 withdrawn；送养者可设 contacting、accepted、rejected、completed；服务器验证前后状态和权限。
- `DELETE /api/applications/:id`：申请人删除 withdrawn/rejected/closed 记录；不可删除有效或完成记录。

状态：pending（待处理）到 contacting（沟通中）到 accepted（已接受）到 completed（已交接）；也可由 pending 直接接受或拒绝。accepted 时猫咪 reserved；completed 时猫咪 adopted，设置 adopterId，同时关闭其他 pending/contacting 申请。取消已接受申请时，猫咪恢复 available。

## 日记

- `GET /api/stories`：公开日记及当前用户自己的私密日记数组，附作者显示名。
- `POST /api/stories`：输入 `{catId,title,text,image,public}`，返回 `{id}`。作者必须已完成该猫咪领养。
- `PUT /api/stories/:id`：作者更新标题、内容、照片和公开性；不能更换 catId。更换照片后，未被其他记录引用的旧上传文件会被清理。
- `DELETE /api/stories/:id`：仅作者可删除；未被其他记录引用的照片也会清理。

标题 1-90 字符，内容 15-5000 字符。public 为布尔值；image 可上传 data URL 或沿用该猫咪/当前日记的照片路径。

## 收藏与清单

- `GET /api/favourites`：当前用户收藏的猫咪 ID 数组。
- `PUT /api/favourites/:id`：收藏现有猫咪；重复请求不新增重复记录。
- `DELETE /api/favourites/:id`：取消收藏。
- `GET /api/checklist`：当前用户已完成条目的整数数组。
- `PUT /api/checklist/:item`：item 为 0-6，输入 `{checked:true}` 或 `{checked:false}`。

## 数据关系

Users 对 Cats、Applications、Diaries 均为一对多；Cats 对 Applications 和 Diaries 均为一对多。Cats.ownerId 是送养者，adopterId 是完成交接后确定的领养者，Applications.userId 是申请人。核心外键、状态检查和唯一索引见 `source/database/schema.sql`。
