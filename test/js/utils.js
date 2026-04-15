export function parseItems(itemString) {
  if (!itemString) return [];

  return itemString.split(",").map((i) => {
    const [name, count] = i.split("*");
    return {
      name: name.trim(),
      count: parseInt(count, 10) || 0
    };
  });
}

export function validateName(name) {
  const fixPattern = /^(.+)[\s_-](\d{1,3})$/;
  const fullPattern = /^.+\(\d{1,3}\)$/;

  if (fixPattern.test(name)) {
    const [, base, num] = name.match(fixPattern);
    name = `${base}(${num})`;
  }

  if (!fullPattern.test(name)) return null;

  return name;
}

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString()}원`;
}

export function formatCount(value) {
  return `${Number(value || 0)}개`;
}

export function formatDate(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("ko-KR");
}

export function getPageParams() {
  return new URLSearchParams(window.location.search);
}

export function buildQueryString(data) {
  return new URLSearchParams(data).toString();
}

export function calculateOrderTotal(items, priceMap) {
  return (items || []).reduce((sum, item) => {
    return sum + (priceMap[item.name] || 0) * item.count;
  }, 0);
}