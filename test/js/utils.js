export function parseItems(itemString) {
  if (!itemString) return [];

  const trimmed = itemString.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          name: String(item.name || "").trim(),
          count: parseInt(item.count, 10) || 0,
          price: Number(item.price) || 0
        }));
      }
    } catch (error) {
      console.error("items JSON 파싱 실패:", error);
    }
  }

  return trimmed.split(",").map((item) => {
    const [name, count] = item.split("*");

    return {
      name: (name || "").trim(),
      count: parseInt(count, 10) || 0,
      price: 0
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

  if (!fullPattern.test(name)) {
    return null;
  }

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

export function calculateOrderTotal(items) {
  return (items || []).reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.count) || 0);
  }, 0);
}