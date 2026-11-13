/* DummyJSON Products API layer (Fetch + async/await) */
const API = 'https://dummyjson.com';
const CATS = ['womens-dresses', 'mens-shirts', 'womens-shoes', 'womens-bags', 'womens-jewellery', 'sunglasses'];

async function getJSON(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error('Request failed (' + res.status + ')');
  return res.json();
}
async function fetchProducts() {
  const parts = await Promise.all(CATS.map(c => getJSON('/products/category/' + c + '?limit=10')));
  return parts.flatMap(p => p.products);
}
async function searchProducts(q) {
  const d = await getJSON('/products/search?q=' + encodeURIComponent(q) + '&limit=60');
  return d.products.filter(p => CATS.includes(p.category));
}
const fetchProduct = id => getJSON('/products/' + id);
