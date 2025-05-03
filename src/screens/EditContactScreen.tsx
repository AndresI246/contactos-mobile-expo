// src/screens/EditContactScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App'; // Ajusta ruta

// --- Tipos ---
interface Contacto { // Tipo para los datos del contacto
  id: number; nombre: string; apellido: string | null; telefono: string; email: string | null; direccion: string | null;
}
interface ContactoUpdateData { // Datos para enviar a la API (sin ID, sin usuario)
    nombre: string;
    apellido?: string | null;
    telefono: string;
    email?: string | null;
    direccion?: string | null;
}
interface ApiErrorResponse { error?: string; detail?: string; [key: string]: any; }
// --- Fin Tipos ---

// Tipos para navegación y parámetros de ruta
type EditContactRouteProp = RouteProp<RootStackParamList, 'EditContact'>;
type EditContactNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditContact'>;

function EditContactScreen() {
  const navigation = useNavigation<EditContactNavigationProp>();
  const route = useRoute<EditContactRouteProp>(); // Hook para obtener parámetros
  const contactId = route.params.contactId; // Obtenemos el ID pasado por navegación

  // Estados para los campos del formulario
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');

  const [loadingInitial, setLoadingInitial] = useState<boolean>(true); // Carga inicial
  const [loadingSaving, setLoadingSaving] = useState<boolean>(false); // Carga al guardar
  const [error, setError] = useState<string | null>(null);

  // --- Cargar datos del contacto al montar ---
  useEffect(() => {
    const loadContactData = async () => {
      setError(null);
      setLoadingInitial(true);
      const token = await SecureStore.getItemAsync('accessToken');

      if (!token) { navigation.replace('Login'); return; }
      if (!contactId) {
          setError("No se proporcionó ID de contacto.");
          setLoadingInitial(false);
          return;
      }

      try {
        const backendUrl = `http://10.0.2.2:8000/api/contactos/${contactId}/`;
        console.log("Cargando datos de:", backendUrl);
        const response = await fetch(backendUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        if (response.status === 401) { navigation.replace('Login'); return; }
        if (response.status === 404) { throw new Error("Contacto no encontrado."); }
        if (!response.ok) { throw new Error(`Error ${response.status} al cargar datos.`); }

        const data: Contacto = await response.json();

        // Rellenar los estados del formulario con los datos cargados
        setNombre(data.nombre);
        setApellido(data.apellido || '');
        setTelefono(data.telefono);
        setEmail(data.email || '');
        setDireccion(data.direccion || '');

        navigation.setOptions({ title: `Editar: ${data.nombre}` }); // Actualizar título de la pantalla

      } catch (err) {
        console.error("Error cargando datos:", err);
        const message = (err instanceof Error) ? err.message : "Error desconocido al cargar.";
        setError(message);
        Alert.alert('Error al Cargar', message);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadContactData();
  }, [contactId, navigation]); // Dependencias del useEffect

  // --- Función para manejar la actualización ---
  const handleUpdateContact = useCallback(async () => {
    setError(null);
    if (!nombre.trim() || !telefono.trim()) {
      setError("Nombre y Teléfono son obligatorios.");
      return;
    }
    setLoadingSaving(true);

    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) { navigation.replace('Login'); return; }

    const updatedData: ContactoUpdateData = {
      nombre: nombre.trim(),
      apellido: apellido.trim() || null,
      telefono: telefono.trim(),
      email: email.trim() || null,
      direccion: direccion.trim() || null,
    };

    try {
      const backendUrl = `http://10.0.2.2:8000/api/contactos/${contactId}/`;
      console.log("Actualizando contacto en:", backendUrl);

      const response = await fetch(backendUrl, {
        method: 'PATCH', // Usamos PATCH
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      let responseData: any = null;
      try { responseData = await response.json(); } catch (e) {}

      if (response.ok) { // Éxito (200 OK para PATCH)
        console.log("Contacto actualizado:", responseData);
        Alert.alert('Éxito', 'Contacto actualizado correctamente.');
        navigation.goBack(); // Volver a la lista
      } else {
         let errorMsg = `Error ${response.status}`;
         if (responseData){
              errorMsg = Object.entries(responseData)
                .map(([field, errors]) => `${field}: ${(Array.isArray(errors) ? errors.join(', ') : errors)}`)
                .join(' | ');
              if (!errorMsg || response.status === 401 || response.status === 403 || response.status === 404) {
                 errorMsg = responseData.detail || responseData.error || `Error ${response.status}`;
              }
         }
         throw new Error(errorMsg || "Error desconocido al actualizar.");
      }
    } catch (err) {
      console.error("Error actualizando contacto:", err);
      const message = (err instanceof Error) ? err.message : 'No se pudo actualizar el contacto.';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoadingSaving(false);
    }
  }, [contactId, nombre, apellido, telefono, email, direccion, navigation]); // Dependencias

  // --- Renderizado ---
  if (loadingInitial) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={{ marginTop: 10, color: '#555' }}>Cargando datos...</Text>
      </View>
    );
  }

   // Mostramos error de carga solo si no está cargando guardado
   if (error && !loadingSaving) {
     return (
       <View style={styles.centered}>
         <Text style={styles.errorText}>{error}</Text>
         <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Volver a la Lista</Text>
         </TouchableOpacity>
       </View>
     );
   }

  // Formulario (igual que el de añadir, pero con valores iniciales)
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Nombre <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Nombre del contacto" editable={!loadingSaving}/>
        <Text style={styles.label}>Apellido</Text>
        <TextInput style={styles.input} value={apellido} onChangeText={setApellido} placeholder="Apellido (opcional)" editable={!loadingSaving}/>
        <Text style={styles.label}>Teléfono <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Número de teléfono" keyboardType="phone-pad" editable={!loadingSaving}/>
        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@ejemplo.com (opcional)" keyboardType="email-address" autoCapitalize='none' editable={!loadingSaving}/>
        <Text style={styles.label}>Dirección</Text>
        <TextInput style={[styles.input, styles.textArea]} value={direccion} onChangeText={setDireccion} placeholder="Dirección (opcional)" multiline={true} numberOfLines={3} editable={!loadingSaving}/>

        {/* Error al guardar */}
        {error && loadingSaving && <Text style={styles.errorText}>{error}</Text>}

        {/* Botón Actualizar */}
        <TouchableOpacity
          style={[styles.button, loadingSaving ? styles.buttonDisabled : {}]}
          onPress={handleUpdateContact}
          disabled={loadingSaving}
        >
          {loadingSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Actualizar Contacto</Text>
          )}
        </TouchableOpacity>

        {/* Botón Cancelar */}
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={loadingSaving}
        >
           <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Estilos (Reutilizamos los de AddContactScreen) ---
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 25, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, // Para carga/error inicial
  label: { fontSize: 14, fontWeight: '500', color: '#444', marginBottom: 5 },
  required: { color: 'red' },
  input: { width: '100%', height: 48, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, backgroundColor: '#fff', fontSize: 16, color: '#333' },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  button: { width: '100%', backgroundColor: '#6200ee', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 15, height: 50, justifyContent: 'center', elevation: 3 },
  buttonDisabled: { backgroundColor: '#b39ddb' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#ccc', marginTop: 10 },
  cancelButtonText: { color: '#333' },
  errorText: { color: '#D32F2F', marginTop: 10, marginBottom: 5, textAlign: 'center', fontSize: 14, fontWeight: '500' },
});

export default EditContactScreen;