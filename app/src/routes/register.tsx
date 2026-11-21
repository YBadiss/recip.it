import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { AuthForm } from '#/components/AuthForm'
import { register } from '#/functions/auth.functions'
import { useSetCurrentUser } from '#/lib/auth'
import { RedirectSearch } from '#/lib/redirect'

export const Route = createFileRoute('/register')({
  validateSearch: RedirectSearch,
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ href: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Register - Recip.it' }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect: redirectTo } = Route.useSearch()
  const setCurrentUser = useSetCurrentUser()
  const router = useRouter()

  return (
    <AuthForm
      title="Register"
      submitLabel="Register"
      pendingLabel="Creating Account..."
      fields={[
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          placeholder: 'Choose a username',
          autoComplete: 'username',
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          placeholder: 'At least 8 characters',
          autoComplete: 'new-password',
        },
        {
          name: 'confirmPassword',
          label: 'Confirm Password',
          type: 'password',
          placeholder: 'Confirm your password',
          autoComplete: 'new-password',
        },
      ]}
      footer={{
        text: 'Already have an account?',
        linkLabel: 'Login',
        to: '/login',
        search: { redirect: redirectTo },
      }}
      onSubmit={async ({
        username = '',
        password = '',
        confirmPassword = '',
      }) => {
        if (password !== confirmPassword)
          throw new Error('Passwords do not match')
        const user = await register({ data: { username, password } })
        await setCurrentUser(user)
        router.history.push(redirectTo ?? '/')
      }}
    />
  )
}
