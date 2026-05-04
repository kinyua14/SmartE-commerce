import { SignIn } from '@clerk/nextjs'

type SignInPageProps = {
  searchParams?: Promise<{
    redirect_url?: string
  }>
}

export default async function Page({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const redirectUrl = params?.redirect_url || '/products'
  const signUpRedirectUrl = `/onboarding?redirect_url=${encodeURIComponent(redirectUrl)}`

  return (
    <SignIn
      forceRedirectUrl={redirectUrl}
      signUpForceRedirectUrl={signUpRedirectUrl}
    />
  )
}
