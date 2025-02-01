import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

const NOTIFY_TRESHOLD = Number(process.env.NOTIFY_TRESHOLD) || 3;
const NUMBER_OF_ATTEMPTS_TO_BAN =
  Number(process.env.NUMBER_OF_ATTEMPTS_TO_BAN) || 10;
const BAN_DURATION = Number(process.env.BAN_DURATION) || 30 * 60 * 1000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || null;

export default class JailManager {
  constructor(dir = path.resolve()) {
    const fileName = "jail.json";

    this.filePath = path.join(dir, fileName);
    this.jail = {};
    this.failures = {}; // 실패 횟수를 저장

    // 초기화
    this.initializeJail();
  }

  // 파일이 없으면 생성하고, 초기화된 ban 리스트를 로드
  initializeJail() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}));
    }
    this.jail = this.getJailFromFile();

    // 남아있는 ban들에 대해 unban 스케줄링
    const currentTime = Date.now();
    for (const ip in this.jail) {
      const expiryTime = this.jail[ip];
      if (expiryTime > currentTime) {
        const remainingTime = expiryTime - currentTime;
        this.scheduleUnban(ip, remainingTime);
      } else {
        // 만료된 ban은 즉시 제거
        this.unbanIP(ip);
      }
    }
  }

  // IP를 ban하는 메서드
  async banIP(ip) {
    const expiryTime = Date.now() + BAN_DURATION;
    this.jail[ip] = expiryTime;
    this.saveJailToFile();

    // 일정 시간 후 unban 스케줄링
    this.scheduleUnban(ip, BAN_DURATION);
    this.notifyToDiscord();
    this.failures[ip] = 0;
    console.info(`IP ${ip} is banned`);
  }

  // IP를 unban하는 메서드
  unbanIP(ip) {
    if (this.jail[ip]) {
      delete this.jail[ip];
      this.saveJailToFile();
      console.info(`IP ${ip} is unbanned`);
    }
  }

  // IP가 ban 상태인지 확인하는 메서드
  isIPBanned(ip) {
    if (this.jail[ip] && this.jail[ip] > Date.now()) {
      return true; // 아직 ban 상태
    } else if (this.jail[ip]) {
      // 만료된 IP는 즉시 제거
      this.unbanIP(ip);
    }
    return false;
  }

  // 비밀번호 실패 횟수를 기록하고, 최대 횟수 초과 시 ban
  recordFailedAttempt(ip) {
    if (this.isIPBanned(ip)) {
      return;
    }

    this.failures[ip] = (this.failures[ip] || 0) + 1;

    if (this.failures[ip] >= NUMBER_OF_ATTEMPTS_TO_BAN) {
      this.banIP(ip);
      delete this.failures[ip]; // 실패 횟수 초기화
    }
  }

  // 실패 기록 초기화 (로그인 성공 시 호출)
  resetFailures(ip) {
    if (this.failures[ip]) {
      delete this.failures[ip];
    }
  }

  // unban 작업을 스케줄링하는 메서드
  scheduleUnban(ip, delay) {
    setTimeout(() => {
      this.unbanIP(ip);
    }, delay);
  }

  // 파일에서 ban 리스트를 읽어오는 메서드
  getJailFromFile() {
    const data = fs.readFileSync(this.filePath, "utf8");
    return JSON.parse(data);
  }

  // ban 리스트를 파일에 저장하는 메서드
  saveJailToFile() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.jail, null, 2));
  }

  // jail을 반환하는 메서드
  getJail() {
    return JSON.parse(JSON.stringify(this.jail));
  }

  // ban된 ip 리스트를 반환하는 메서드
  getBannedIpList() {
    return Object.keys(this.jail);
  }

  notifyToDiscord() {
    const bannedIp = this.getBannedIpList();
    const numberOfBannedIp = bannedIp.length;

    if (numberOfBannedIp >= NOTIFY_TRESHOLD && DISCORD_WEBHOOK_URL) {
      const message = `:closed_lock_with_key: ${numberOfBannedIp} IPs are banned. \nBanned IP: ${bannedIp.join(
        " | "
      )}`;

      fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message,
        }),
      })
        .then((res) => {
          if (res.status !== 204) {
            console.error("Failed to send notification to Discord");
          }
        })
        .catch((err) => {
          console.error("Failed to send notification to Discord");
        });
    }
  }
}
