// src/screens/ContactListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Button, Alert, RefreshControl, SafeAreaView
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App'; // Ajusta ruta si es necesario

// --- Tipos ---
interface Contacto {
  id: number;
  nombre: string;
  apellido: string | null;
  telefono: string;
  email: string | null;
  // Añade otros campos si tu serializer los devuelve y quieres usarlos
}
interface ApiErrorResponse { error?: string; detail?: string; }
// --- Fin Tipos ---

// Tipo para la navegación
type ContactListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ContactList'>;

// Componente para cada item de la lista (mejor práctica)
// Recibe el contacto y funciones para editar/eliminar
const ContactItem = React.memo(({ contact, onEdit, onDelete }: { contact: Contacto, onEdit: (id: number) => void, onDelete: (id: number) => void }) => {
    const fullName = `${contact.nombre} ${contact.apellido || ''}`.trim();
    return (
        <View style={styles.contactItem}>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{fullName}</Text>
                <Text style={styles.contactDetail}>Tel: {contact.telefono}</Text>
                {contact.email && <Text style={styles.contactDetail}>Email: {contact.email}</Text>}
            </View>
            <View style={styles.contactActions}>
                <TouchableOpacity onPress={() => onEdit(contact.id)} style={[styles.actionButton, styles.editButton]}>
                    <Text style={styles.actionButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(contact.id)} style={[styles.actionButton, styles.deleteButton]}>
                    <Text style={styles.actionButtonText}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});


function ContactListScreen() {
  const navigation = useNavigation<ContactListNavigationProp>();
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // --- Función para obtener los contactos ---
  const fetchContacts = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) { // No mostrar el spinner grande si es refresh manual
        setLoading(true);
    }
    setError(null);
    const token = await SecureStore.getItemAsync('accessToken');

    if (!token) {
      setError("No autenticado.");
      setLoading(false);
      navigation.replace('Login'); // Ir a Login si no hay token
      return;
    }

    try {
      const backendUrl = 'http://10.0.2.2:8000/api/contactos/'; // ¡URL para contactos!
      console.log(`Workspaceing contacts from ${backendUrl}`);
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });

      if (response.status === 401) {
        console.log("Token inválido/expirado (401) en fetchContacts");
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        navigation.replace('Login');
        return;
      }

      if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try {
            const errorData: ApiErrorResponse = await response.json();
            errorMsg = errorData.detail || errorData.error || errorMsg;
        } catch(e) { /* Ignorar error de parseo */ }
        throw new Error(errorMsg);
      }

      const data: Contacto[] = await response.json();
      console.log("Contactos recibidos:", data.length);
      setContacts(data); // Guardar contactos en el estado

    } catch (err) {
      console.error("Error obteniendo contactos:", err);
      const message = (err instanceof Error) ? err.message : 'Error al cargar contactos.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]); // Dependencia de navigation por si redirigimos

  // --- Cargar datos cuando la pantalla obtiene el foco ---
  useFocusEffect(
    useCallback(() => {
      console.log("Pantalla ContactList obtuvo foco, cargando datos...");
      setLoading(true); // Mostrar carga al entrar/volver a la pantalla
      fetchContacts();
    }, [fetchContacts]) // Ejecutar cada vez que fetchContacts cambie (solo cuando navigation cambia)
  );

  // --- Función para Pull-to-Refresh ---
  const onRefresh = useCallback(() => {
    console.log("Iniciando refresh manual...");
    setRefreshing(true);
    fetchContacts(true); // Llama a fetch indicando que es refresh manual
  }, [fetchContacts]);

  // --- Función para manejar la eliminación ---
  const handleDelete = useCallback((id: number) => {
    Alert.alert(
        "Confirmar Eliminación",
        "¿Estás seguro de que quieres eliminar este contacto?",
        [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: async () => {
                    console.log(`Intentando eliminar contacto ${id}`);
                    const token = await SecureStore.getItemAsync('accessToken');
                    if (!token) { navigation.replace('Login'); return; }

                    // Aquí podrías poner un estado de carga específico para la eliminación si quieres
                    try {
                        const backendUrl = `http://10.0.2.2:8000/api/contactos/${id}/`;
                        const response = await fetch(backendUrl, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (response.status === 401) { navigation.replace('Login'); return; }

                        if (response.ok || response.status === 204) { // 204 No Content es éxito para DELETE
                            console.log(`Contacto ${id} eliminado.`);
                            // Quitar el contacto de la lista local O refrescar toda la lista
                            // setContacts(prevContacts => prevContacts.filter(c => c.id !== id)); // Opción 1: Rápido
                            fetchContacts(); // Opción 2: Más simple, recarga todo
                        } else {
                            let errorMsg = `Error ${response.status}`;
                             try { const errorData = await response.json(); errorMsg = errorData.detail || errorData.error || errorMsg;}
                             catch(e){}
                            throw new Error(errorMsg);
                        }
                    } catch (err) {
                         console.error("Error eliminando contacto:", err);
                         const message = (err instanceof Error) ? err.message : 'No se pudo eliminar el contacto.';
                         Alert.alert('Error', message);
                    }
                }
            }
        ]
    );
  }, [navigation, fetchContacts]); // Dependencias

  // --- Función para manejar la edición ---
  const handleEdit = useCallback((id: number) => {
  console.log(`Navegando a editar contacto ${id}`);
  // Navegar a la pantalla de edición pasando el ID como parámetro
  navigation.navigate('EditContact', { contactId: id }); // <-- Actualizar aquí
  // Alert.alert("Próximamente", ...); // Quitar alerta
  }, [navigation]);

  // --- Función para cerrar sesión ---
  const handleLogout = useCallback(async () => {
      console.log("Cerrando sesión...");
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      navigation.replace('Login');
  }, [navigation]);

  // --- Renderizado ---
  const renderContent = () => {
    if (loading && contacts.length === 0) { // Carga inicial
      return <ActivityIndicator size="large" color="#6200ee" style={styles.centered}/>;
    }
    if (error && contacts.length === 0) { // Error sin datos previos
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Reintentar" onPress={() => fetchContacts()} color="#6200ee"/>
        </View>
      );
    }
     if (!loading && contacts.length === 0) { // Sin contactos
        return (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No tienes contactos guardados.</Text>
            <Button title="Añadir Primer Contacto" onPress={navigateToAddContact} color="#6200ee"/>
          </View>
        );
     }

    // Lista de contactos
    return (
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ContactItem contact={item} onEdit={handleEdit} onDelete={handleDelete} />
        )}
        style={styles.list}
        // Indicador de Pull-to-Refresh
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6200ee"]}/>
        }
      />
    );
  };

  const navigateToAddContact = () => {
    // Alert.alert("Próximamente", "..."); // Quita la alerta
    navigation.navigate('AddContact'); // <-- Navega a la pantalla AddContact
  }

  return (
    // SafeAreaView evita que el contenido se solape con la barra de estado o el notch
    <SafeAreaView style={styles.safeArea}>
        {/* Botón Añadir Flotante (Ejemplo) */}
        {/* <TouchableOpacity style={styles.addButton} onPress={navigateToAddContact}>
            <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity> */}

        {/* Botón Añadir en Header (Alternativa) */}
         <View style={styles.headerButtons}>
             <Button title="+ Añadir" onPress={navigateToAddContact} color="#6200ee"/>
             <View style={{ width: 10 }} /> {/* Separador */}
             <Button title="Cerrar Sesión" onPress={handleLogout} color="#ff4d4d"/>
         </View>


        {renderContent()}
    </SafeAreaView>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8', // Fondo consistente
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  emptyText: {
     fontSize: 16,
     color: '#555',
     textAlign: 'center',
     marginBottom: 15,
  },
  list: {
    flex: 1, // Asegura que la lista ocupe el espacio disponible
  },
  contactItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1, },
    shadowOpacity: 0.15,
    shadowRadius: 2.22,
    elevation: 3,
    flexDirection: 'row', // Para poner info y botones lado a lado
    justifyContent: 'space-between', // Espacio entre info y botones
    alignItems: 'center', // Centrar verticalmente
  },
  contactInfo: {
     flex: 1, // Ocupa el espacio sobrante
     marginRight: 10,
  },
  contactName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
  },
  contactActions: {
     flexDirection: 'row', // Botones en fila
     gap: 8, // Espacio entre botones
  },
  actionButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 5,
      justifyContent: 'center',
      alignItems: 'center',
  },
  editButton: {
      backgroundColor: '#ffc107', // Amarillo
  },
  deleteButton: {
       backgroundColor: '#f44336', // Rojo
  },
  actionButtonText: {
       color: '#ffffff',
       fontSize: 12,
       fontWeight: '500',
  },
  headerButtons: { // Estilo para botones en la cabecera (o donde los pongas)
      flexDirection: 'row',
      justifyContent: 'space-around', // O 'flex-end' si los quieres a la derecha
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      backgroundColor: '#f8f8f8', // Fondo ligero para header
  },
  // Estilos para botón flotante (si lo prefieres)
  // addButton: {
  //   position: 'absolute',
  //   bottom: 30,
  //   right: 30,
  //   width: 60,
  //   height: 60,
  //   borderRadius: 30,
  //   backgroundColor: '#6200ee',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   elevation: 8,
  // },
  // addButtonText: {
  //   fontSize: 30,
  //   color: '#fff',
  //   lineHeight: 30, // Ajuste para centrar el '+'
  // }
});

export default ContactListScreen;