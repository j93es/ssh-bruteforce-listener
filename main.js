import dotenv from "dotenv";
dotenv.config();

import ssh2Pkg from "ssh2";
import fs from "fs";
import path from "path";
import JailManager from "./src/jail-manager.js";

const formatDateToCustomString = (date) => {
  const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const day = koreaDate.getUTCDate().toString().padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[koreaDate.getUTCMonth()];
  const year = koreaDate.getUTCFullYear();
  const hours = koreaDate.getUTCHours().toString().padStart(2, "0");
  const minutes = koreaDate.getUTCMinutes().toString().padStart(2, "0");
  const seconds = koreaDate.getUTCSeconds().toString().padStart(2, "0");

  const formattedDate = `${day}/${month}/${year}:${hours}:${minutes}:${seconds} +0900`;
  return formattedDate;
};

try {
  console.log = console.log.bind(
    console,
    `[${formatDateToCustomString(new Date())}]`
  );
  console.info = console.info.bind(
    console,
    `[${formatDateToCustomString(new Date())}]`
  );
  console.error = console.error.bind(
    console,
    `[${formatDateToCustomString(new Date())}]`
  );

  const { Server } = ssh2Pkg;

  const PORT = process.env.PORT || 2222;

  // 알림을 위한 임계값
  // ban된 ip 개수가 해당 값 이상일 때, ban된 ip의 개수가 증가할 때마다 알림

  const NUMBER_OF_ATTEMPTS_FOR_ONE_CONNECTION = 3;
  const ATTEMPT_INTERVAL = 1024;
  const AUTH_METHOD = "password";

  const jailManager = new JailManager(path.resolve());

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

      client.on("authentication", (ctx) => {
        if (jailManager.isIPBanned(clientIP)) {
          attemptsLog.push({
            status: "ban",
          });
          setTimeout(() => {
            client.end();
          }, ATTEMPT_INTERVAL);

          return;
        }

        if (ctx.method !== AUTH_METHOD) {
          return setTimeout(() => {
            ctx.reject([AUTH_METHOD]);
          }, ATTEMPT_INTERVAL);
        }

        const { username, password } = ctx;
        if (username.length > 32) {
          attemptsLog.push({
            status: "long id",
          });
        } else if (password.length > 32) {
          attemptsLog.push({
            status: "long pw",
          });
        } else {
          attemptsLog.push({
            id: username,
            pw: password,
          });
        }

        attemptCount++;
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
        console.log(`[${clientIP}] ${JSON.stringify(attemptsLog)}`);
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
  server.setMaxListeners(5);

  // 서버 실행
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`SSH 서버가 ${PORT}번 포트에서 실행 중...`);
  });
} catch (error) {
  console.error(error);
}
