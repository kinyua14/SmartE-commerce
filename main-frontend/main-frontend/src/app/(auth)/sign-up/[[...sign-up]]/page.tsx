import { SignUp } from '@clerk/nextjs'

type SignUpPageProps = {
  searchParams?: Promise<{
    redirect_url?: string
  }>
}

export default async function Page({ searchParams }: SignUpPageProps) {
  const params = await searchParams
  const redirectUrl = params?.redirect_url || '/products'
  const onboardingRedirectUrl = `/onboarding?redirect_url=${encodeURIComponent(redirectUrl)}`
  const signInRedirectUrl = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`

  return (
    <SignUp
      forceRedirectUrl={onboardingRedirectUrl}
      signInForceRedirectUrl={signInRedirectUrl}
    />
  )
}
