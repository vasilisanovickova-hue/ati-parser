const fetch = require('node-fetch'); // Установится автоматически с puppeteer, или добавь в package.json

(async () => {
    try {
        console.log('1. Запрашиваем грузы через API ATI.SU...');

        const response = await fetch('https://api.ati.su/v3/load_search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
                "filter": {
                    "from": { "id": 135, "type": 2, "exactOnly": false },
                    "to": { "id": 1, "type": 2, "exactOnly": false },
                    "dates": { "dateOption": "today-plus" },
                    "extraParams": 0,
                    "excludeTenders": false,
                    "sortingType": 2
                },
                "page": 1,
                "pageSize": 20
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const results = data.loads.map(item => {
            const from = item.route.points[0]?.name || '—';
            const to = item.route.points[item.route.points.length - 1]?.name || '—';
            const weight = item.cargo.weight ? `${item.cargo.weight} т` : '—';
            const price = item.rate?.value ? `${item.rate.value} руб.` : 'Ставка скрыта';
            const link = `https://loads.ati.su/loadinfo/${item.uuid}`;

            return { from, to, weight, price, link };
        });

        console.log('✅ Собрано грузов:', results.length);
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
        process.exit(1);
    }
})();