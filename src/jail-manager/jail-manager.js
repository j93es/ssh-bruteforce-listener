import fs from "fs";
import path from "path";

export default class JailManager {
  constructor(dir = path.resolve(), maxFailures = 3, banDuration = 300000) {
    const fileName = "jail.json";

    this.filePath = path.join(dir, fileName);
    this.banList = {};
    this.failures = {}; // 실패 횟수를 저장
    this.maxFailures = maxFailures; // 최대 실패 횟수
    this.banDuration = banDuration; // ban 지속 시간(ms)

    // 초기화
    this.initializeBanList();
  }

  // 파일이 없으면 생성하고, 초기화된 ban 리스트를 로드
  initializeBanList() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}));
    }
    this.banList = this.getBanListFromFile();

    // 남아있는 ban들에 대해 unban 스케줄링
    const currentTime = Date.now();
    for (const ip in this.banList) {
      const expiryTime = this.banList[ip];
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
  banIP(ip, duration = this.banDuration) {
    const expiryTime = Date.now() + duration;
    this.banList[ip] = expiryTime;
    this.saveBanListToFile();

    // 일정 시간 후 unban 스케줄링
    this.scheduleUnban(ip, duration);
    console.info(`IP ${ip} is banned`);
  }

  // IP를 unban하는 메서드
  unbanIP(ip) {
    if (this.banList[ip]) {
      delete this.banList[ip];
      this.saveBanListToFile();
      console.info(`IP ${ip} is unbanned`);
    }
  }

  // IP가 ban 상태인지 확인하는 메서드
  isIPBanned(ip) {
    if (this.banList[ip] && this.banList[ip] > Date.now()) {
      return true; // 아직 ban 상태
    } else if (this.banList[ip]) {
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

    if (this.failures[ip] >= this.maxFailures) {
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
  getBanListFromFile() {
    const data = fs.readFileSync(this.filePath, "utf8");
    return JSON.parse(data);
  }

  // ban 리스트를 파일에 저장하는 메서드
  saveBanListToFile() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.banList, null, 2));
  }

  getBanList() {
    return JSON.parse(JSON.stringify(this.banList));
  }

  getBannedIpList() {
    return Object.keys(this.banList);
  }

  // ban 리스트의 key 개수를 반환하는 메서드(ban된 ip의 개수를 반환)
  getNumberOfBanList() {
    return Object.keys(this.banList).length;
  }
}
