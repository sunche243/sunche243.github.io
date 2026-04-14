export const menuItems = [
  { name: "화생방 닭발 세트(닭발 + 주먹밥)", price: 23000, type: "main" },
  { name: "전역 후에도 생각나는 엄마표 볶음밥", price: 15000, type: "main" },
  { name: "프리미엄 뽀글이(공화춘 + 간짬뽕 + 냉동)", price: 13000, type: "main" },
  { name: "절대 들켜선 안돼.. 나만의 비밀국수", price: 8000, type: "side" },
  { name: "선임 몰래 먹는 크래커", price: 6000, type: "side" },
  { name: "주먹밥은 못참치", price: 7000, type: "side" }
];

export const priceMap = Object.fromEntries(
  menuItems.map(item => [item.name, item.price])
);