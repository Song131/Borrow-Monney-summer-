export async function api(method, url, data, isForm = false) {
  const opts = { method, credentials: 'include' };
  if (data) {
    if (isForm) opts.body = data;
    else {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(data);
    }
  }
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'เกิดข้อผิดพลาด');
  return json;
}
