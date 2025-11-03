'use client'

import CreateStudent from '../../../components/CreateStudent'

export default function CreateStudentWrapper() {
  return <CreateStudent onCreated={() => window.location.reload()} />
}

