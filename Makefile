# Variables
REPO_URL=https://github.com/j93es/ssh-bruteforce-listener.git
PROJECT_DIR=/srv/ssh-bruteforce-listener/ssh-bruteforce-listener

# Targets
.PHONY: all init update build deploy start-pm2 stop-pm2 save-pm2

update:
	if [ ! -d "$(PROJECT_DIR)" ]; then \
		sudo git clone $(REPO_URL) $(PROJECT_DIR); \
	else \
		cd $(PROJECT_DIR) && if sudo git pull | grep -q "Already up to date."; then \
			echo "No changes to update. Exiting..."; \
			exit 1; \
		fi; \
	fi

update-force:
	if [ ! -d "$(PROJECT_DIR)" ]; then \
		sudo git clone $(REPO_URL) $(PROJECT_DIR); \
	else \
		cd $(PROJECT_DIR) && sudo git pull || true; \
	fi

init:
	if [ ! -f "$(PROJECT_DIR)/.env" ]; then \
		sudo touch $(PROJECT_DIR)/.env; \
		echo read README.md for deployment; \
		exit 1; \
	fi

	if [ ! -f "$(PROJECT_DIR)/host.key" ]; then \
		cd $(PROJECT_DIR) && \
		sudo ssh-keygen -t rsa -b 2048 -f host.key -N '' &&
		sudo chmod +r $(PROJECT_DIR)/host.key; \
	fi
	
build:
	cd $(PROJECT_DIR) && sudo npm install

stop-pm2:
	sudo pm2 stop ssh-bruteforce-listener || true && sudo pm2 delete ssh-bruteforce-listener || true

start-pm2:
	cd $(PROJECT_DIR) && sudo pm2 start npm --name ssh-bruteforce-listener -- run start

save-pm2:
	sudo pm2 save

deploy: update init build stop-pm2 start-pm2 save-pm2
	@echo "Deployment completed."

deploy-force: update-force init build stop-pm2 start-pm2 save-pm2
	@echo "Deployment completed."

all: deploy