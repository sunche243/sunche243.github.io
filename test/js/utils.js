export function parseItems(itemString) {
  if (!itemString) return [];

  return itemString.split(',').map(i => {
    const [name, count] = i.split('*');
    return {
      name: name.trim(),
      count: parseInt(count) || 0
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