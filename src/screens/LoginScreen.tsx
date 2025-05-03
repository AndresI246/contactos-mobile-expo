// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity, // Usaremos este para el botón estilizado
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
// Importa el tipo de la lista de parámetros del navegador definido en App.tsx
// Ajusta la ruta relativa si tu App.tsx está en otro lugar
import type { RootStackParamList } from '../../App';

// --- Tipos para la Respuesta de la API ---
interface LoginSuccessResponse {
  access: string;
  refresh: string;
}
interface ApiErrorResponse {
  error?: string;  // Para errores 403/500 que definimos nosotros
  detail?: string; // Para errores 401 de SimpleJWT
}
// --- Fin Tipos ---

// Define el tipo para la prop de navegación que usará useNavigation
type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

function LoginScreen() {
  // Hook de navegación para poder cambiar de pantalla
  const navigation = useNavigation<LoginScreenNavigationProp>();

  // Estados del componente
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Función para manejar el intento de login
  const handleLogin = async () => {
    // Validación básica
    if (!username || !password) {
      setError('Por favor, ingresa usuario y contraseña.');
      return;
    }
    setError(null); // Limpiar errores previos
    setLoading(true); // Mostrar indicador de carga

    try {
      // URL del backend usando la IP especial para emulador Android
      const backendUrl = 'http://10.0.2.2:8000/api/token/'; // Endpoint de SimpleJWT

      console.log(`Intentando login a ${backendUrl} con usuario: ${username}`);

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password }), // SimpleJWT espera 'username' y 'password'
      });

      let responseData: any = null;
      try {
          responseData = await response.json(); // Intentar parsear JSON siempre
      } catch(e) {
          console.log("Respuesta sin JSON o error al parsear", response.status, response.statusText);
          if (!response.ok) { // Si hubo error HTTP y no hay JSON
             throw new Error(`Error ${response.status}: ${response.statusText || 'Error de servidor'}`);
          }
          // Si fue OK pero sin JSON (raro para /api/token/)
          throw new Error('Respuesta inesperada del servidor.');
      }


      if (response.ok) { // Estado 200 OK
        console.log('Login exitoso, tokens recibidos.');
        const tokens = responseData as LoginSuccessResponse;

        if (tokens.access && tokens.refresh) {
          // Guardar tokens de forma segura
          await SecureStore.setItemAsync('accessToken', tokens.access);
          await SecureStore.setItemAsync('refreshToken', tokens.refresh);
          console.log('Tokens guardados.');

          // Navegar a la pantalla de Lista de Contactos y reemplazar Login en la pila
          navigation.replace('ContactList'); // Reemplaza Login por ContactList

        } else {
           console.error("Respuesta OK pero faltan tokens:", responseData);
           throw new Error('Respuesta inválida del servidor (faltan tokens).');
        }

      } else {
        // Error de API (400, 401, 403, 500, etc.)
        // SimpleJWT usualmente usa 'detail' para el error 401
        const errorMsg = (responseData as ApiErrorResponse)?.detail || (responseData as ApiErrorResponse)?.error || `Error ${response.status}`;
        console.error('Error de API en login:', responseData);
        throw new Error(errorMsg); // Lanza el error para que lo capture el catch
      }

    } catch (err) {
      // Error de Red o error lanzado desde el bloque try
      console.error('Error en handleLogin:', err);
      const message = (err instanceof Error) ? err.message : 'No se pudo conectar al servidor.';
      setError(message);
      Alert.alert('Error de Inicio de Sesión', message); // Muestra el error al usuario
    } finally {
      // Quitar estado de carga
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Gestor de Contactos</Text>
        <Text style={styles.subtitle}>Iniciar Sesión</Text>

        {/* Input para Nombre de Usuario */}
        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
          placeholderTextColor="#999"
        />

        {/* Input para Contraseña */}
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true} // Oculta la contraseña
          editable={!loading}
          placeholderTextColor="#999"
        />

        {/* Muestra mensaje de error si existe */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Botón de Ingresar */}
        <TouchableOpacity
          style={[styles.button, loading ? styles.buttonDisabled : {}]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
        </TouchableOpacity>

        {/* Podrías añadir un enlace a una futura pantalla de registro aquí */}
        {/* <Text style={styles.registerText}>¿No tienes cuenta? Regístrate</Text> */}

      </View>
    </KeyboardAvoidingView>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40, // Más padding horizontal
    paddingBottom: 20, // Padding inferior
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: 32, // Más grande
    fontWeight: 'bold',
    marginBottom: 10, // Menos espacio
    color: '#333',
  },
  subtitle: {
    fontSize: 20,
    color: '#555',
    marginBottom: 40, // Más espacio debajo del subtítulo
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333', // Color de texto
  },
  button: {
    width: '100%',
    backgroundColor: '#6200ee', // Color principal morado
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15, // Más espacio arriba del botón
    height: 50,
    justifyContent: 'center',
    shadowColor: "#000", // Sombra (iOS)
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Sombra (Android)
  },
  buttonDisabled: {
    backgroundColor: '#b39ddb', // Color más claro cuando deshabilitado
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#D32F2F', // Rojo oscuro para errores
    marginTop: 10, // Espacio arriba del error
    marginBottom: 5, // Espacio debajo del error
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  // registerText: { // Estilo para enlace de registro (opcional)
  //   marginTop: 30,
  //   color: '#6200ee',
  //   textDecorationLine: 'underline',
  // },
});

export default LoginScreen;