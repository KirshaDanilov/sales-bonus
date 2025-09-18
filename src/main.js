function calculateSimpleRevenue(purchaseItem, product) {
  const grossRevenue = purchaseItem.sale_price * purchaseItem.quantity;
  const discount = typeof purchaseItem.discount === 'number' ? purchaseItem.discount : 0;
  const revenue = grossRevenue * (1 - discount / 100);
  return revenue;
}

function calculateBonusByProfit(index, total, seller) {
  if (index === 0) {
    return seller.profit * 0.15;
  } else if (index === 1 || index === 2) {
    return seller.profit * 0.10;
  } else if (index === total - 1) {
    return 0;
  } else {
    return seller.profit * 0.05;
  }
}

function analyzeSalesData(data, options) {
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error('Некорректные входные данные');
  }

  if (typeof options !== 'object' || options === null) {
    throw new Error('Опции должны быть объектом');
  }

  const { calculateRevenue, calculateBonus } = options;

  if (!calculateRevenue || !calculateBonus) {
    throw new Error('В опциях отсутствуют необходимые функции');
  }

  if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
    throw new Error('calculateRevenue и calculateBonus должны быть функциями');
  }

  const sellerStats = data.sellers.map(seller => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
    bonus: 0,
    top_products: []
  }));

  const sellerIndex = Object.fromEntries(
    sellerStats.map(seller => [seller.seller_id, seller])
  );

  const productIndex = Object.fromEntries(
    data.products.map(product => [product.sku, product])
  );

  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;

    record.items.forEach(purchaseItem => {
      const product = productIndex[purchaseItem.sku];
      if (!product) return;

      const cost = product.purchase_price * purchaseItem.quantity;
      const revenue = calculateRevenue(purchaseItem, product);
      const profit = revenue - cost;

      seller.revenue += revenue;
      seller.profit += profit;

      seller.products_sold[purchaseItem.sku] = (seller.products_sold[purchaseItem.sku] || 0) + purchaseItem.quantity;
    });
  });

  sellerStats.sort((a, b) => b.profit - a.profit);

  const totalSellers = sellerStats.length;

  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, totalSellers, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map(seller => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2)
  }));
}