import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Badge, Table } from 'react-bootstrap'
import { usersQuery } from '#/lib/queries'

export const Route = createFileRoute('/admin/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(usersQuery),
  component: UsersPage,
})

function UsersPage() {
  const { data: users } = useSuspenseQuery(usersQuery)

  return (
    <Table responsive hover className="bg-white">
      <thead>
        <tr>
          <th>Username</th>
          <th>User ID</th>
          <th>Recipes</th>
          <th>Created</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        {users.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-center">
              No users found
            </td>
          </tr>
        ) : (
          users.map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td className="font-monospace small">{user.id}</td>
              <td>{user.recipeCount}</td>
              <td>{user.created_at.slice(0, 10)}</td>
              <td>
                {user.isAdmin ? (
                  <Badge bg="danger">admin</Badge>
                ) : (
                  <Badge bg="secondary">user</Badge>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  )
}
