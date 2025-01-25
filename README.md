# ssh-bruteforce-listener

본 프로젝트는 ssh bruteforce 공격을 모니터링하기 위하여 개발되었습니다. 공격자가 입력한 정보를 수집하고, 공격 추이가 빈번해진다면 discord로 알림을 제공합니다.

# dotenv

```env
PORT={실행할 포트}

DISCORD_WEBHOOK_URL={discord webhook url}

NOTIFY_TRESHOLD={해당 값 이상의 ip가 ban되었고, ban된 ip가 증가할 때마다 알림 제공}
```

# Makefile

```sh
# git repo가 local과 다를때, 선택적으로 deploy
make deploy

# 항상 deploy
make deploy-force
```
