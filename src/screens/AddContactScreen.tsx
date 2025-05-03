// src/screens/AddContactScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App'; // Ajusta ruta si es necesario

// --- Tipos ---
interface ContactoData { // Datos para enviar a la API
    nombre: string;
    apellido?: string | null;
    telefono: string;
    email?: string | null;
    direccion?: string | null;
}
interface ApiErrorResponse { error?: string; detail?: string; [key: string]: any; }
// --- Fin Tipos ---

type AddContactNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddContact'>;

function AddContactScreen() {
  const navigation = useNavigation<AddContactNavigationProp>();

  // Estados para cada campo del formulario
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddContact = useCallback(async () => {
    setError(null);
    // Validación básica en cliente
    if (!nombre.trim() || !telefono.trim()) {
      setError("Nombre y Teléfono son obligatorios.");
      return;
    }
    setLoading(true);

    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      navigation.replace('Login'); // Ir a Login si no hay token
      return;
    }

    // Preparar datos (incluir opcionales solo si tienen valor)
    const contactData: ContactoData = {
      nombre: nombre.trim(),
      ...(apellido.trim() && { apellido: apellido.trim() }),
      telefono: telefono.trim(),
      ...(email.trim() && { email: email.trim() }),
      ...(direccion.trim() && { direccion: direccion.trim() }),
    };

    try {
      const backendUrl = 'http://10.0.2.2:8000/api/contactos/'; // URL para crear (POST)
      console.log("Enviando nuevo contacto a:", backendUrl);

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      let responseData: any = null;
      try { responseData = await response.json(); } catch(e) {}

      if (response.ok || response.status === 201) { // 201 Created es éxito para POST
        console.log("Contacto añadido:", responseData);
        Alert.alert('Éxito', 'Contacto añadido correctamente.');
        navigation.goBack(); // Volver a la pantalla anterior (la lista)
      } else {
        let errorMsg = `Error ${response.status}`;
        if (responseData){
             errorMsg = Object.entries(responseData)
               .map(([field, errors]) => `${field}: ${(Array.isArray(errors) ? errors.join(', ') : errors)}`)
               .join(' | ');
             if (!errorMessages || response.status === 401 || response.status === 403) {
                errorMessages = responseData.detail || responseData.error || `Error ${response.status}`;
             }
        }
        throw new Error(errorMsg || "Error desconocido al guardar.");
      }
    } catch (err) {
      console.error("Error añadiendo contacto:", err);
      const message = (err instanceof Error) ? err.message : 'No se pudo guardar el contacto.';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [nombre, apellido, telefono, email, direccion, navigation]); // Dependencias del callback

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {/* ScrollView permite desplazar si el formulario es largo */}
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Nombre <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre del contacto"
          editable={!loading}
        />

        <Text style={styles.label}>Apellido</Text>
        <TextInput
          style={styles.input}
          value={apellido}
          onChangeText={setApellido}
          placeholder="Apellido (opcional)"
          editable={!loading}
        />

        <Text style={styles.label}>Teléfono <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={telefono}
          onChangeText={setTelefono}
          placeholder="Número de teléfono"
          keyboardType="phone-pad" // Teclado numérico
          editable={!loading}
        />

        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@ejemplo.com (opcional)"
          keyboardType="email-address"
          autoCapitalize='none'
          editable={!loading}
        />

        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={[styles.input, styles.textArea]} // Estilo para multilínea
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Dirección (opcional)"
          multiline={true} // Permite múltiples líneas
          numberOfLines={3}
          editable={!loading}
        />

        {/* Muestra error si existe */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Botón Guardar con indicador de carga */}
        <TouchableOpacity
          style={[styles.button, loading ? styles.buttonDisabled : {}]}
          onPress={handleAddContact}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Guardar Contacto</Text>
          )}
        </TouchableOpacity>

        {/* Botón Cancelar (opcional) */}
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]} // Estilo diferente
          onPress={() => navigation.goBack()} // Simplemente vuelve atrás
          disabled={loading}
        >
           <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Estilos --- (Similares a Login, con algunos ajustes)
const styles = StyleSheet.create({
  container: {
    flexGrow: 1, // Importante para que ScrollView funcione bien con KeyboardAvoidingView
    padding: 25,
    backgroundColor: '#f0f4f8',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    marginBottom: 5,
  },
  required: {
      color: 'red',
  },
  input: {
    width: '100%',
    height: 48, // Ligeramente más bajo
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  textArea: {
      height: 80, // Más alto para multilínea
      textAlignVertical: 'top', // Empezar a escribir desde arriba en Android
      paddingTop: 10, // Padding superior
  },
  button: {
    width: '100%',
    backgroundColor: '#6200ee',
    paddingVertical: 14, // Ligeramente menos padding
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    height: 50,
    justifyContent: 'center',
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#b39ddb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
      backgroundColor: '#ccc', // Color gris para cancelar
      marginTop: 10, // Menos margen arriba
  },
  cancelButtonText: {
       color: '#333', // Texto más oscuro
  },
  errorText: {
    color: '#D32F2F',
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AddContactScreen;