# Render + Aiven 部署指南

本部署使用 **Render Web Service** 託管 Node.js 應用程式，並以 **Aiven for MySQL** 保存資料。`render.yaml` 以 Docker runtime 定義 Web Service、`/health` HTTP 健康檢查與 Render 的安全環境變數提示。Render 官方文件說明 Docker Web Service 可從 repository 中的 Dockerfile 建置，並支援 Blueprint 的 `dockerfilePath`、`dockerContext`、`healthCheckPath` 和 `sync: false` secret 欄位。[1] [2]

## 1. 建立 Aiven MySQL

在 Aiven Console 建立 **Aiven for MySQL** service，待 service 成為 Running 後下載 CA certificate。請在 Connection information 記錄 host、port、user、password 及 database name；建立或選用空白的 `baccarat_predictor` 資料庫。

以 Aiven 官方建議的 MySQL 指令匯入本專案的資料庫檔，密碼由互動提示輸入，避免寫入 shell history：

```bash
mysql -p baccarat_predictor -P "$AIVEN_MYSQL_PORT" \
  -h "$AIVEN_MYSQL_HOST" -u "$AIVEN_MYSQL_USER" \
  --ssl-mode=VERIFY_CA --ssl-ca=./ca.pem --password \
  < database/baccarat_predictor_database.sql
```

將 CA certificate 轉為單行 base64：

```bash
base64 -w 0 ./ca.pem
```

## 2. 設定 Render

請將修正版來源推送到私有 GitHub 或 GitLab repository，再在 Render Dashboard 使用 **New → Blueprint** 匯入 `render.yaml`。此 Blueprint 預設使用 Render `free` Web Service，服務可能在閒置後休眠；如需不休眠，請自行在 Render Dashboard 選擇付費方案後確認費用。

> 若改用 Render 的 **Public Git Repository** 流程，請先確認目前 GitHub 瀏覽器工作階段對該公開 repository 具有寫入權限。專案目前的 browser session 顯示為 `van5t90o-rgb`，但目標 repository 位於 `48hx5nkzcr-svg`；若沒有 collaborator 權限，GitHub 不會顯示建立檔案或上傳選項。請登入 repository 擁有者帳戶，或由擁有者將目前帳戶加入為 collaborator 後，再進行公開來源上傳。

在 Blueprint 的 secret 輸入畫面設定下列值：

| 環境變數 | 設定方式 |
|---|---|
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:PORT/baccarat_predictor`；特殊字元密碼須 URL encode。 |
| `DATABASE_SSL_CA_BASE64` | 上一步輸出的單行 CA base64。 |
| `OAUTH_SERVER_URL`、`VITE_APP_ID`、`VITE_OAUTH_PORTAL_URL`、`OWNER_OPEN_ID` | 若要保留既有 OAuth 登入流程，請依您的 OAuth provider 設定。 |
| `BUILT_IN_FORGE_API_URL`、`BUILT_IN_FORGE_API_KEY` | 僅使用 Manus storage proxy 時才需設定。 |

`JWT_SECRET` 由 Blueprint 自動產生。Deploy 成功後，以 `https://<service>.onrender.com/health` 檢查回應；資料庫連線成功時應回傳 HTTP 200 與 `database: "connected"`。

## 參考資料

[1] [Render：Docker on Render](https://render.com/docs/docker)

[2] [Render：Blueprint YAML Reference](https://render.com/docs/blueprint-spec)

[3] [Render：Health Checks](https://render.com/docs/health-checks)

[4] [Aiven：Backup and restore MySQL with mysqldump](https://aiven.io/docs/products/mysql/howto/migrate-database-mysqldump)
