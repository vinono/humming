# 性能基准与压测指南

本代码库内置了一套自动化的本地转发基准测试工作流，帮助开发者在开发过程中直观度量代理层的转发损耗。

执行基准压测命令：

```bash
bun run benchmark:forward
```

---

## 压测执行流程

运行该脚本时，压测工具会在本地后台同时拉起：
1. **Mock 上游服务**（作为基准参考点）
2. **Humming 实例**（开启流式反向代理）

随后，压测工具会在三种经典流量场景下，自动对比 **直连上游（Direct）** 与 **经由 Humming 代理（Forward）** 的吞吐与延迟表现：

- **`small`**：微型 JSON 报文（典型 RESTful API 查询）
- **`large`**：较大尺寸的二进制数据包（图片、文件流传输）
- **`stream`**：分块文本流 / SSE 事件流（实时推送与 AI 流式交互）

---

## 压测结果输出解读

压测脚本会生成紧凑的性能对比报表：

```text
scenario             reqs   conc    total(ms)        req/s     avg(ms)     p50(ms)     p95(ms)     p99(ms)
direct-small          200     20       4.64ms     43065.93       0.45       0.36       0.98       0.98
forward-small         200     20      14.27ms     14012.72       1.40       1.31       2.38       2.46
```

### 关键指标说明：
- **`req/s` (吞吐量)**：每秒完成的请求总数。
- **`avg(ms)` (平均耗时)**：请求往返的平均响应时间。
- **`p50 / p95 / p99` (分位数延迟)**：分别代表 50%、95%、99% 的请求耗时上限（微秒/毫秒级）。

---

## 常用环境变量配置

您可以通过设置环境变量微调压测并发度与请求量：

- **`BENCH_CONCURRENCY`**：并发连接数（默认 `20`）
- **`BENCH_SMALL_REQUESTS`**：小报文测试请求量（默认 `200`）
- **`BENCH_LARGE_REQUESTS`**：大文件测试请求量（默认 `60`）
- **`BENCH_STREAM_REQUESTS`**：流式测试请求量（默认 `120`）
- **`BENCH_WARMUP_REQUESTS`**：预热请求数（默认 `20`）

### 自定义高并发压测示例：

```bash
BENCH_CONCURRENCY=50 \
BENCH_SMALL_REQUESTS=1000 \
BENCH_LARGE_REQUESTS=200 \
BENCH_STREAM_REQUESTS=500 \
bun run benchmark:forward
```

---

## 研发工程中的最佳实践

建议将本地基准测试作为以下场景的代码回归质量红线：

1. 修改了底层 `forward` 核心转发逻辑
2. 重构了转发生命周期钩子（`beforeRequest` / `afterResponse`）
3. 调整了 Request / Response 请求头过滤或克隆逻辑
4. 更改了底层 `fetch` / `keepalive` 传输策略

> [!NOTE]
> 本地压测用于快速排查 CPU 密集型回归或内存泄露，不能直接等同于跨机房公网生产环境的最终容量评估。
