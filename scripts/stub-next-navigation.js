// Stub de next/navigation pour rendu hors Next (renderToString)
module.exports = {
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }),
  useParams: () => ({}),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useSelectedLayoutSegment: () => null,
  useSelectedLayoutSegments: () => [],
  redirect: () => { throw new Error('redirect hors Next'); },
  notFound: () => { throw new Error('notFound hors Next'); },
};
