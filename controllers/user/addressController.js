import Address from '../../models/Address.js'

const getAddresses = async (req,res) =>{
    try {
        const userId = req.user.id;
        const addresses = await Address.find({userId});

        console.log('Found addresses:', addresses);

        res.status(200).json({
            success : true,
            addresses
        })

    } catch (error) {
        console.error('Error in getAddresses:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching addresses',
            error: error.message
        })
    }
}

const getAddress = async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            userId: req.user._id
        })

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found"
            })
        }

        res.status(200).json({
            success: true,
            address
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching address",
            error: error.message
        });
    }
}

const createAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName,
            lastName,
            phoneNumber,
            streetAddress,
            city,
            state,
            pincode,
            isDefault = false
        } = req.body;

        if (!firstName || !lastName || !phoneNumber || !streetAddress || !city || !state || !pincode) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields"
            })
        }

        const newAddress = await Address.create({
            userId,
            firstName,
            lastName,
            phoneNumber,
            streetAddress,
            city,
            state,
            pincode,
            isDefault
        });


        if (isDefault) {
            await Address.updateMany(
                { userId, _id: { $ne: newAddress._id } },
                { isDefault: false }
            );
        }

        res.status(201).json({
            success: true,
            message: 'Address created successfully',
            address: newAddress
        });


    } catch (error) {
        console.error('Error creating address:', error);
        res.status(400).json({
            success: false,
            message: 'Error creating address',
            error: error.message
        });
    }
}

// const updateAddress = async (req, res) => {
//     try {
//         console.group('Update req')
//         let address = await Address.findOne({
//             _id: req.params.id,
//             userId: req.user._id
//         })

//         if (!address) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Address not found"
//             })
//         }
//         address = await Address.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             {
//                 new: true,
//                 runValidators: true
//             }
//         );

//         res.status(200).json({
//             success: true,
//             address
//         });
//     } catch (error) {
//         res.status(400).json({
//             success: false,
//             message: "Error updating address",
//             error: error.message
//         });
//     }
// };

const updateAddress = async ( req,res) =>{
    try {
        console.log('Update request for address ID:', req.params.id);
        console.log('User ID:', req.user.id);
        console.log('Update payload:', req.body);
        
        let address = await Address.findOne({
            _id : req.params.id,
            userId : req.user.id
        })
        if (!address) {
            console.log('Address not found or does not belong to user');
            return res.status(404).json({
                success: false,
                message: "Address not found or doesn't belong to current user"
            });
        }

        if (req.body.isDefault) {
            await Address.updateMany(
                { 
                    userId: req.user.id, 
                    _id: { $ne: req.params.id } 
                },
                { isDefault: false }
            );
        }

        const updatedAddress = await Address.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                    phoneNumber: req.body.phoneNumber,
                    streetAddress: req.body.streetAddress,
                    city: req.body.city,
                    state: req.body.state,
                    pincode: req.body.pincode,
                    isDefault: req.body.isDefault
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        // Log the updated address
        console.log('Address updated successfully:', updatedAddress);

        res.status(200).json({
            success: true,
            message: 'Address updated successfully',
            address: updatedAddress
        });


    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({
            success: false,
            message: "Error updating address",
            error: error.message
        });
    }
}

const deleteAddress = async (req, res) => {
    try {
       
        const userId = req.user.id;
        console.log('Delete request received for address ID:', req.params.id);
        console.log('User ID from token:', userId);
        const address = await Address.findOne({
            _id: req.params.id,
            userId: userId
        })

        console.log('Found address:', address);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found or doesnt belong to current user"
            });

        }

        await address.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Address deleted successfully'
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting address",
            error: error.message
        });
    }
}

const addressManagement = async (req, res) => {
    try {
        
    } catch (error) {
        
    }
}

export default { getAddress, getAddresses, createAddress, updateAddress, deleteAddress }