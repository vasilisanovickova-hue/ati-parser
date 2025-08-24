const puppeteer = require('puppeteer');

const browser = await puppeteer.launch({
    headless: "new",  // или true, если не нужен GUI
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process' // Важно для Render
    ],
    executablePath: process.env.CHROME_PATH || undefined
});

    const page = await browser.newPage();

    try {
        console.log('1. Открываем: https://loads.ati.su');
        await page.goto('https://loads.ati.su', { waitUntil: 'networkidle0', timeout: 60000 });

        // Ждём 7 секунд — чтобы React приложение загрузилось
        await new Promise(resolve => setTimeout(resolve, 7000));

        // Устанавливаем фильтр: Нижний Новгород → Санкт-Петербург
        const filterHash = '?filter=%7B"from"%3A%7B"id"%3A135%2C"type"%3A2%2C"exactOnly"%3Afalse%7D%2C"to"%3A%7B"id"%3A1%2C"type"%3A2%2C"exactOnly"%3Afalse%7D%2C"dates"%3A%7B"dateOption"%3A"today-plus"%7D%2C"extraParams"%3A0%2C"excludeTenders"%3Afalse%2C"sortingType"%3A2%7D&version=v2';

        await page.evaluate((hash) => {
            window.location.hash = hash;
        }, filterHash);

        console.log('2. Хэш установлен вручную');

        // Ждём 30 секунд — чтобы грузы точно подгрузились
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Проверяем, есть ли грузы
        const hasLoads = await page.$('[data-app="pretty-load"]') !== null;

        if (!hasLoads) {
            console.log('❌ Грузы не появились');
            return;
        }

        console.log('🚚 Грузы загружены');

        // Собираем данные
        const results = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[data-app="pretty-load"]'));
    return items.map(item => {
        // Ищем города
        const cityElements = Array.from(item.querySelectorAll('div.xsQQG'));
        const from = cityElements[0]?.textContent.trim() || '—';
        const to = cityElements[1]?.textContent.trim() || '—';

        // Извлекаем вес
        const weightEl = item.querySelector('span.OIT8K');
        const weightText = weightEl?.textContent || '';
        const weightMatch = weightText.match(/(\d+(\.\d+)?)\s*т/);
        const weight = weightMatch ? weightMatch[1] + ' т' : '—';

        // Извлекаем цену
        const priceEl = item.querySelector('[data-testid="compact-view-hidden-rate"]');
        const price = priceEl?.textContent.trim() || 'Ставка скрыта';

        // Извлекаем UUID из data-load-id
        const loadId = item.getAttribute('data-load-id') || '—';
        const link = loadId && loadId !== '—'
            ? `https://loads.ati.su/loadinfo/${loadId}`
            : '#';

        return { from, to, weight, price, link };
    });
});

        console.log('✅ Собрано грузов:', results.length);
        console.log(results);

      

        console.log('✅ Все грузы обработаны');
        console.log(results);

        // Сохраняем в Google Таблицу
        const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSewZDD-roxaFvIql8olF-vACwspYJFaY4AisDAJOS5akaSt3Q/formResponse';

        for (const load of results) {
            const formData = new URLSearchParams();
            formData.append('entry.1286213485', load.from);
            formData.append('entry.469133788', load.to);
            formData.append('entry.629164283', load.weight);
            formData.append('entry.140660058', load.price);
            formData.append('entry.1860236215', load.link);
            formData.append('entry.1887606198', new Date().toLocaleString('ru-RU'));

            try {
                const response = await fetch(formUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (response.ok) {
                    console.log(`✅ Груз отправлен: ${load.from} → ${load.to}`);
                } else {
                    console.log(`❌ Ошибка отправки: ${response.status}`);
                }
            } catch (error) {
                console.error('❌ Ошибка сети:', error.message);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('✅ Все грузы обработаны и отправлены в Google Таблицу');

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }

    // browser.close(); // Раскомментируй, если хочешь, чтобы браузер закрылся
})();