# 英语复习卡首轮推广素材包

这套素材服务于“小红书 / 视频号提升 Codex Skill 下载量”。项目免费开源且不限制下载人数。所有产品画面均来自真实渲染；生成式图片只用作场景背景。

## 目录

- `demo-quiz.json`：机场英语演示题库。
- `demo-card.html`：由正式 Python renderer 生成的真实互动卡片。
- `carousel.html`：六页小红书图文源文件，通过 `?page=1` 到 `?page=6` 切页。
- `horizontal-video.html`：横版视频五个场景的源文件，通过 `?scene=1` 到 `?scene=5` 切换。
- `download-direct.html`：允许外链渠道使用的直接下载物料。
- `flow.html`：横版使用流程图。
- `faq.html`：FAQ 长图。
- `scripts-and-copy.md`：35 秒主视频、90 秒教程、发布文案和录屏清单。
- `recruitment-form.md`：体验招募表字段和自动回复。
- `metrics.csv`：首轮数据跟踪模板。
- `assets/`：可直接发布或进入剪辑软件的图片、截图和 GIF。

## 安全边界

- 不宣称 Skill 会自动读取其他聊天。
- 不把私有 ChatGPT App 描述为公开可安装产品。
- 不公开 MCP 地址、账号、通知或部署信息。
- 不保存完整对话和答题过程；只描述项目当前支持的最小化日期摘要。

## 重新生成演示卡

```bash
python3 english-review-card/scripts/render_review_card.py promotion/demo-quiz.json promotion/demo-card.html
```

图片源文件使用固定画布，可通过浏览器截图重新导出。横版视频突出真实卡片；若要展示定时任务创建过程，应补录真实 Codex 操作，素材包不会用虚假 UI 替代。
