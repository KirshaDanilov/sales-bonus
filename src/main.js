function calculateSimpleRevenue(sale_price, quantity, discount) {
  return sale_price * quantity * discount;
}

function calculateBonusByProfit(profit, index, total) {
  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.10;
  } else if (index === total - 1) {
    return 0;
  } else {
    return profit * 0.05;
  }
}

function analyzeSalesData(data, options) {
  if (!data || typeof data !== 'object') throw new Error('Некорректные данные');
  if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
    throw new Error('Некорректные опции');
  }

  const { calculateRevenue, calculateBonus } = options;

  // Построение индексов для быстрого доступа:
  const sellerIndex = {};
  data.sellers.forEach(seller => {
    sellerIndex[seller.id] = {
      seller_id: seller.id,
      name: seller.name,
      sales_count: 0,
      revenue: 0,
      profit: 0,
      products_sold: {},
    };
  });

  const productIndex = {};
  data.products.forEach(product => {
    productIndex[product.sku] = product;
  });

  // Проход по продажам:
  data.sales.forEach(sale => {
    const seller = sellerIndex[sale.seller_id];
    if (!seller) return; // Пропускаем неизвестных продавцов

    seller.sales_count += 1;

    sale.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const discount = 1 - (item.discount || 0) / 100;
      const revenue = calculateRevenue(item.sale_price, item.quantity, discount);
      const cost = product.purchase_price * item.quantity;
      const profit = revenue - cost;

      seller.revenue += revenue;
      seller.profit += profit;

      seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
    });
  });

  // Сортируем по прибыли:
  const sellersArray = Object.values(sellerIndex);
  sellersArray.sort((a, b) => b.profit - a.profit);
  const totalSellers = sellersArray.length;

  // Добавляем бонусы и топ товаров
  sellersArray.forEach((seller, index) => {
    seller.bonus = calculateBonus(seller.profit, index, totalSellers);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Форматируем результат
  return sellersArray.map(seller => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}