# Oracle Cloud Infrastructure（OCI）部署指南

本專案的 Oracle Cloud 目標為 **OCI Compute VM + Docker Compose + MySQL 8.4**。這個架構可同時公開 Express/Vite 應用程式與保存 MySQL 資料；原始 MySQL 匯出檔在首次啟動 MySQL volume 時自動匯入。OCI Compute 文件說明，建立 Linux VM 時需要 VCN、公開 IP（如需從網際網路連線）與 SSH key。[1]

> 此組態會在同一台 VM 上執行應用程式與資料庫，適合自行測試或小型工作負載。若您需要資料庫高可用、獨立備份策略或與應用程式分離的網路邊界，可改用 Oracle MySQL HeatWave 作為資料庫，並保留應用程式容器於 Compute VM。

## 1. 建立 OCI Compute VM

請在 OCI Console 建立 Ubuntu 或 Oracle Linux VM，指派 public IP，並保存 SSH private key。VCN／Network Security Group 請僅開放以下必要 ingress：

| 連接埠 | 來源 | 用途 |
|---|---|---|
| TCP 22 | 僅您的管理 IP | SSH 維運 |
| TCP 80 | `0.0.0.0/0` | HTTP 網頁服務 |
| TCP 443 | `0.0.0.0/0` | HTTPS；設定反向代理與憑證後使用 |

請勿公開 TCP 3306。MySQL 僅由 Docker internal network 中的應用程式存取。

## 2. 安裝 Docker 並上傳專案

在 VM 上安裝 Docker Engine 與 Docker Compose plugin。將此修正版專案上傳至 VM 後：

```bash
cd baccarat-predictor-export/source
cp .env.oci.example .env.oci
chmod 600 .env.oci
# 以安全編輯器填入強密碼與 JWT_SECRET
docker compose --env-file .env.oci -f compose.oci.yaml up -d --build
docker compose --env-file .env.oci -f compose.oci.yaml ps
docker compose --env-file .env.oci -f compose.oci.yaml logs -f app
```

首次啟動時，`database/baccarat_predictor_database.sql` 會由 MySQL 官方 image 載入；後續重啟不會重複匯入。現有資料存於 Docker named volume `mysql_data`，請定期備份。

## 3. 驗證與 HTTPS

以 `http://<VM_PUBLIC_IP>/` 檢查應用程式。生產環境請在應用程式前配置 Caddy、Nginx 或 OCI Load Balancer 來終結 HTTPS，並設定 OAuth callback URI 為：

```text
https://<您的網域>/api/oauth/callback
```

## 4. MySQL HeatWave（選用）

若採用 Oracle MySQL HeatWave，請不要啟動 Compose 中的 `mysql` service。將 `DATABASE_URL` 改為 HeatWave 連線資料，並以 Oracle 官方支援的 MySQL Shell dump／load 程序匯入資料；應用程式可透過 `DATABASE_SSL_CA_BASE64` 注入 CA certificate。[2]

## 參考資料

[1] [OCI Compute：Creating an Instance](https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/launchinginstance.htm)

[2] [MySQL Shell：Dump Loading Utility](https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-load-dump.html)
