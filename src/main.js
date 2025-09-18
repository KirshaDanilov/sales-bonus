/*** Функция для расчета выручки
* @param purchase запись о покупке
* @param _product карточка товара
* @returns {number}
*/
function calculateSimpleRevenue(purchase, _product) {
     const grossRevenue = purchase.sale_price * purchase.quantity;

  // Применяем скидку (если discount — в процентах)
  const revenue = grossRevenue * (1 - (purchase.discount || 0) / 100);

  return revenue;
}

/** * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
    // Лучший продавец получает 15% от прибыли
    return seller.profit * 0.15;
  } else if (index === 1 || index === 2) {
    // Второй и третий получают по 10%
    return seller.profit * 0.10;
  } else if (index === total - 1) {
    // Самый последний в рейтинге — без бонуса
    return 0;
  } else {
    // Остальные получают 5%
    return seller.profit * 0.05;
  }
}
/*** Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */


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

    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const profit = revenue - cost;

      seller.revenue += revenue;
      seller.profit += profit;

      seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
    });
  });

  sellerStats.sort((a, b) => b.profit - a.profit);

  const totalSellers = sellerStats.length;

  sellerStats.forEach((seller, index) => {
    let bonus = calculateBonus(seller, index, totalSellers);
    // Защита от NaN:
    if (isNaN(bonus)) {
      bonus = 0;
    }
    seller.bonus = bonus;

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map(seller => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: isNaN(seller.revenue) ? 0 : +seller.revenue.toFixed(2),
    profit: isNaN(seller.profit) ? 0 : +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2)
  }));
}
