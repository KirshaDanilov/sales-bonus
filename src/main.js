/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, product) {
    const revenue = product.retail_price * purchase.quantity * (1 - (purchase.discount || 0));
    const cost = product.purchase_price * purchase.quantity;
    return revenue - cost;
}

function calculateBonusByProfit(index, totalProfit, seller) {
    if (index === 0) return totalProfit * 0.1;
    if (index === 1) return totalProfit * 0.05;
    return totalProfit * 0.02;
}

function analyzeSalesData(data, options) {
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
    if (!options || typeof options.calculateSimpleRevenue !== 'function' || typeof options.calculateBonusByProfit !== 'function') {
        throw new Error('Не переданы обязательные функции calculateSimpleRevenue и calculateBonusByProfit');
    }
    const { calculateSimpleRevenue, calculateBonusByProfit } = options;
    const sellerIndex = new Map();
    data.sellers.forEach(seller => {
        sellerIndex.set(seller.id, {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            profit: 0,
            sales_count: 0,
            products_sold: {},
        });
    });
    const productIndex = new Map();
    data.products.forEach(product => {
        productIndex.set(product.sku, product);
    });
    data.purchase_records.forEach(record => {
        const seller = sellerIndex.get(record.seller_id);
        if (!seller) return;
        seller.sales_count++;
        record.items.forEach(item => {
            const product = productIndex.get(item.sku);
            if (!product) return;
            const profit = calculateSimpleRevenue(item, product);
            seller.profit += profit;
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });
    const sellers = Array.from(sellerIndex.values());
    sellers.sort((a, b) => b.profit - a.profit);
    sellers.forEach((seller, idx) => {
        seller.bonus = calculateBonusByProfit(idx, seller.profit, seller);
    });
    return sellers;
}