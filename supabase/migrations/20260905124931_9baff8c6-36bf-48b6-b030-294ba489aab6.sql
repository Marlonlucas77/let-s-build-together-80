
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_quote_number() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_opportunity_number() FROM public, anon, authenticated;
