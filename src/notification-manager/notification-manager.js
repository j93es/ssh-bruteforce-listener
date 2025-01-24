export default class NotificationManager {
  constructor(discordWebhookUrl) {
    this.discordWebhookUrl = discordWebhookUrl;
  }

  toDiscord(message) {
    if (!this.discordWebhookUrl) {
      return;
    }

    fetch(this.discordWebhookUrl, {
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
