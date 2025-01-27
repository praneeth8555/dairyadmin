import {
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    Input,
    Select,
    Button
} from "@chakra-ui/react";
import { useRef, useEffect } from "react";
import debounce from "lodash.debounce";

const CustomerDrawer = ({
    isOpen,
    onClose,
    editCustomer,
    setEditCustomer,
    newCustomer,
    setNewCustomer,
    apartments,
    selectedApartment, // New prop
    addCustomer,
    updateCustomer
}) => {
    // Debounced function to delay state updates
    const debouncedUpdate = useRef(
        debounce((field, value) => {
            setEditCustomer((prev) => prev ? { ...prev, [field]: value } : prev);
            setNewCustomer((prev) => prev ? { ...prev, [field]: value } : prev);
        }, 300) // Adjust delay as needed
    ).current;

    // Handle input change with debounce
    const handleChange = (e, field) => {
        debouncedUpdate(field, e.target.value);
    };
    const handleClose = () => {
        onClose();
        setEditCustomer(null);
        setNewCustomer({ name: "", apartment_id: selectedApartment || "", room_number: "", phone_number: "", email: "" });
    };

    // Set default apartment when drawer opens
    useEffect(() => {
        if (!editCustomer && selectedApartment) {
            setNewCustomer((prev) => ({ ...prev, apartment_id: selectedApartment }));
        }
    }, [isOpen, selectedApartment, editCustomer, setNewCustomer]);

    return (
        <Drawer isOpen={isOpen} placement="right" onClose={handleClose}>
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader>{editCustomer ? "Edit Customer" : "Add Customer"}</DrawerHeader>
                <DrawerBody>
                    <Input
                        placeholder="Name"
                        defaultValue={editCustomer ? editCustomer.name : newCustomer.name}
                        onChange={(e) => handleChange(e, "name")}
                        mb={3}
                    />
                    <Select
                        defaultValue={
                            editCustomer
                                ? editCustomer.apartment_id
                                : (newCustomer.apartment_id || selectedApartment)
                        }
                        onChange={(e) => handleChange(e, "apartment_id")}
                        mb={3}
                    >
                        {apartments?.length > 0 ? (
                            apartments.map((apt) => (
                                <option key={apt.apartment_id} value={apt.apartment_id}>
                                    {apt.apartment_name}
                                </option>
                            ))
                        ) : (
                            <option disabled>No apartments available</option>
                        )}
                    </Select>

                    <Input
                        placeholder="Room No"
                        defaultValue={editCustomer ? editCustomer.room_number : newCustomer.room_number}
                        onChange={(e) => handleChange(e, "room_number")}
                        mb={3}
                    />
                    <Input
                        placeholder="Phone Number"
                        defaultValue={editCustomer ? editCustomer.phone_number : newCustomer.phone_number}
                        onChange={(e) => handleChange(e, "phone_number")}
                        mb={3}
                    />
                    <Input
                        placeholder="Email"
                        defaultValue={editCustomer ? editCustomer.email : newCustomer.email}
                        onChange={(e) => handleChange(e, "email")}
                        mb={3}
                    />

                    <Button mt={4} colorScheme="green" onClick={editCustomer ? updateCustomer : addCustomer}>
                        {editCustomer ? "Save Changes" : "Add Customer"}
                    </Button>
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
};

export default CustomerDrawer;
