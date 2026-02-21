import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function updateVehicleKm(vehicleId: string, newKm: number): Promise<void> {
  if (!vehicleId || !newKm || newKm === 0) {
    return;
  }

  try {
    await updateDoc(doc(db, 'vehicles', vehicleId), {
      current_km: newKm
    });
  } catch (error) {
    console.error('Error updating vehicle KM:', error);
  }
}
