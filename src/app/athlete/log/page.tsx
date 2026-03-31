import { redirect } from 'next/navigation'

export default function AthleteLogRedirect() {
  redirect('/athlete/checkin')
}
