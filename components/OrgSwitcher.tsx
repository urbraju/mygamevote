import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Pressable, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const OrgSwitcher = () => {
    const { organizations, activeOrgId, setActiveOrgId } = useAuth();
    const [modalVisible, setModalVisible] = useState(false);

    if (organizations.length <= 1) return null;

    const activeOrg = organizations.find(o => o.id === activeOrgId) || organizations[0];

    const handleSelect = (id: string) => {
        setActiveOrgId(id);
        setModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.trigger}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
                role="button"
                accessibilityLabel="Switch Organization"
            >
                <View style={styles.orgInfo}>
                    <Text style={styles.orgName} numberOfLines={1}>{activeOrg.name}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                </View>
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Switch Organization</Text>
                        <FlatList
                            data={organizations}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.orgItem,
                                        item.id === activeOrgId && styles.activeOrgItem
                                    ]}
                                    onPress={() => handleSelect(item.id)}
                                >
                                    <View style={styles.orgItemContent}>
                                        <Text style={[
                                            styles.orgItemName,
                                            item.id === activeOrgId && styles.activeOrgItemName
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {item.id === activeOrgId && (
                                            <MaterialCommunityIcons name="check" size={20} color="#007AFF" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                            role="button"
                            accessibilityLabel="Close"
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginRight: 10,
    },
    trigger: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        maxWidth: 180,
    },
    orgInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    orgName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        maxHeight: '70%',
        ...Platform.select({
            web: {
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)'
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
            }
        }),
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    orgItem: {
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    activeOrgItem: {
        backgroundColor: '#f0f7ff',
    },
    orgItemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orgItemName: {
        fontSize: 16,
        color: '#333',
    },
    activeOrgItemName: {
        fontWeight: 'bold',
        color: '#007AFF',
    },
    closeButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    }
});
