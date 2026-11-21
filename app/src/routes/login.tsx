import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { AuthForm } from '#/components/AuthForm'
import { login } from '#/functions/auth.functions'
import { useSetCurrentUser } from '#/lib/auth'
import { RedirectSearch } from '#/lib/redirect'

export const Route = createFileRoute('/login')({
  validateSearch: RedirectSearch,
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ href: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Login - Recip.it' }] }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch()
  const setCurrentUser = useSetCurrentUser()
  const router = useRouter()

  return (
    <AuthForm
      title="Login"
      submitLabel="Login"
      pendingLabel="Logging in..."
      fields={[
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          placeholder: 'Enter username',
          autoComplete: 'username',
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          placeholder: 'Password',
          autoComplete: 'current-password',
        },
      ]}
      footer={{
        text: "Don't have an account?",
        linkLabel: 'Register',
        to: '/register',
        search: { redirect: redirectTo },
      }}
      onSubmit={async ({ username = '', password = '' }) => {
        const user = await login({ data: { username, password } })
        await setCurrentUser(user)
        router.history.push(redirectTo ?? '/')
      }}
    />
  )
}
