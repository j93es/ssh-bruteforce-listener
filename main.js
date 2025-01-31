import dotenv from "dotenv";
dotenv.config();

import ssh2Pkg from "ssh2";
import fs from "fs";
import path from "path";
import JailManager from "./src/jail-manager/jail-manager.js";
import NotificationManager from "./src/notification-manager/notification-manager.js";

try {
  console.log = console.log.bind(console, `[${new Date()}]`);
  console.info = console.info.bind(console, `[${new Date()}]`);
  console.error = console.error.bind(console, `[${new Date()}]`);

  const { Server } = ssh2Pkg;

  // 알림을 위한 임계값
  // ban된 ip 개수가 해당 값 이상일 때, ban된 ip의 개수가 증가할 때마다 알림
  const NOTIFY_TRESHOLD = process.env.NOTIFY_TRESHOLD || 3;

  const PORT = process.env.PORT || 2222;
  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || null;

  const NUMBER_OF_ATTEMPTS_FOR_ONE_CONNECTION = 3;
  const ATTEMPT_INTERVAL = 1024;
  const AUTH_METHOD = "password";

  const NUMBER_OF_ATTEMPTS_TO_BAN = 2 * NUMBER_OF_ATTEMPTS_FOR_ONE_CONNECTION;
  const BAN_DURATION = 24 * 60 * 60 * 1000;

  const jailManager = new JailManager(
    path.resolve(),
    NUMBER_OF_ATTEMPTS_TO_BAN,
    BAN_DURATION
  );
  const notificationManager = new NotificationManager(DISCORD_WEBHOOK_URL);

  const server = new Server(
    {
      hostKeys: [fs.readFileSync("host.key")],
      banner:
        "All your inputs are recorded. If you do not agree, please close the connection.",
    },
    (client) => {
      const clientIP = client._sock.remoteAddress;
      let attemptCount = 0;
      const attemptsLog = []; // 시도한 id, 비밀번호 저장

      client.on("handshake", (ctx) => {
        if (jailManager.isIPBanned(clientIP)) {
          attemptsLog.push({
            isBanned: true,
          });
          setTimeout(() => {
            client.end();
          }, ATTEMPT_INTERVAL);

          return;
        }
      });

      client.on("authentication", (ctx) => {
        if (ctx.method !== AUTH_METHOD) {
          return setTimeout(() => {
            ctx.reject([AUTH_METHOD]);
          }, ATTEMPT_INTERVAL);
        }

        attemptCount++;

        const { username, password } = ctx;
        attemptsLog.push({
          id: username,
          pw: password,
        });

        jailManager.recordFailedAttempt(clientIP);

        if (attemptCount < NUMBER_OF_ATTEMPTS_FOR_ONE_CONNECTION) {
          setTimeout(() => {
            ctx.reject();
          }, ATTEMPT_INTERVAL); // 인증 거부, 재시도 허용
        } else {
          setTimeout(() => {
            ctx.reject([AUTH_METHOD]);
          }, ATTEMPT_INTERVAL); // 마지막 인증 거부 시도
        }
      });

      client.on("end", () => {
        console.log(`[${clientIP}] | ${JSON.stringify(attemptsLog)}`);

        if (jailManager.getNumberOfBanList() >= NOTIFY_TRESHOLD) {
          const currentNumberOfBanList = jailManager.getNumberOfBanList();
          const bannedIp = jailManager.getBannedIpList();

          notificationManager.toDiscord(
            `:closed_lock_with_key: IP ${clientIP} banned. ${currentNumberOfBanList} IPs are banned. \nBanned IP: ${bannedIp}`
          );
        }
      });

      client.on("close", () => {
        client.removeAllListeners();
      });

      client.on("error", (err) => {
        console.error(`[${clientIP}] | ${err.message}`);
        return;
      });
    }
  );

  server.maxConnections = 5;

  // 서버 실행
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`SSH 서버가 ${PORT}번 포트에서 실행 중...`);
  });
} catch (error) {
  console.error(error);
}
