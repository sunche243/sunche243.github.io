export function normalizeMenuOptions(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      const label = String(option?.label || "").trim();
      const price = Number(option?.price);

      if (!label || !Number.isFinite(price) || price < 0) {
        return null;
      }

      return {
        label,
        price
      };
    })
    .filter(Boolean);
}

export function normalizeComboRule(comboRule) {
  if (!comboRule || comboRule.enabled !== true) {
    return null;
  }

  const unitSize = parseInt(comboRule.unitSize, 10);

  if (!Number.isFinite(unitSize) || unitSize <= 0) {
    return null;
  }

  return {
    enabled: true,
    unitSize
  };
}

export function normalizeItemOptions(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      const label = String(option?.label || "").trim();
      const price = Number(option?.price);
      const count = parseInt(option?.count, 10);

      if (
        !label ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isFinite(count) ||
        count <= 0
      ) {
        return null;
      }

      return {
        label,
        price,
        count
      };
    })
    .filter(Boolean);
}

export function calculateItemOptionTotal(options) {
  return normalizeItemOptions(options).reduce((sum, option) => {
    return sum + option.price * option.count;
  }, 0);
}

export function calculateOrderItemTotal(item) {
  const itemPrice = Number(item?.price) || 0;
  const itemCount = Number(item?.count) || 0;

  return itemPrice * itemCount + calculateItemOptionTotal(item?.options);
}

export function parseItems(itemString) {
  if (!itemString) return [];

  const trimmed = itemString.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          name: String(item?.name || "").trim(),
          count: parseInt(item?.count, 10) || 0,
          price: Number(item?.price) || 0,
          options: normalizeItemOptions(item?.options),
          comboRule: normalizeComboRule(item?.comboRule)
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
      price: 0,
      options: [],
      comboRule: null
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

export function normalizeTableNumber(value) {
  const raw = String(value ?? "").trim();

  if (!/^\d{1,3}$/.test(raw)) {
    return null;
  }

  return String(parseInt(raw, 10));
}

export function isValidTableNumber(value) {
  const normalized = normalizeTableNumber(value);

  if (!normalized) {
    return false;
  }

  const tableNumber = Number(normalized);
  return tableNumber >= 1 && tableNumber <= 100;
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

export function readSessionStorageJSON(key) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.error(`${key} sessionStorage 파싱 실패:`, error);
    return null;
  }
}

export function writeSessionStorageJSON(key, value) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify(value));
}

export function removeSessionStorageValue(key) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  window.sessionStorage.removeItem(key);
}

export function formatOrderItemCount(item) {
  const count = Number(item?.count) || 0;
  const comboRule = normalizeComboRule(item?.comboRule);

  if (comboRule) {
    return `${count}세트`;
  }

  return `${count}개`;
}

export function calculateOrderTotal(items) {
  return (items || []).reduce((sum, item) => {
    return sum + calculateOrderItemTotal(item);
  }, 0);
}
