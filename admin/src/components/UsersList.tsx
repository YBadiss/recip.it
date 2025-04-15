import { User } from '../utils/types';

interface UsersListProps {
  users: User[];
}

const UsersList: React.FC<UsersListProps> = ({ users }) => {
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.username}</div>
      ))}
    </div>
  );
};

export default UsersList;
