// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import ContactListScreen from './src/screens/ContacListScreen';
import AddContactScreen from './src/screens/AddContactScreen'; // <-- Importa la nueva pantalla
import EditContactScreen from './src/screens/EditContactScreen'; // <-- Importa la pantalla de edición

const Stack = createNativeStackNavigator();

// Añade la nueva ruta a la lista de parámetros
export type RootStackParamList = {
  Login: undefined;
  ContactList: undefined;
  AddContact: undefined; // <-- Nueva pantalla sin parámetros iniciales
  // EditContact: { contactId: number }; // <-- Añadiremos esta después
};

function App() {
  const initialRouteName: keyof RootStackParamList = 'Login'; // Sigue empezando en Login

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Iniciar Sesión' }}
          />
         <Stack.Screen
            name="ContactList"
            component={ContactListScreen}
            options={{ title: 'Mis Contactos' }}
          />
         <Stack.Screen
            name="AddContact"
            component={AddContactScreen}
            options={{ title: 'Añadir Contacto' }} // Título para la nueva pantalla
          />
          <Stack.Screen
            name="EditContact"
            component={EditContactScreen}
            options={{ title: 'Editar Contacto' }}
          />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;