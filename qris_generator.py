"""
EMVCo QRIS Dynamic Generator (Bank Indonesia / ASPI Standard)
Mengubah QRIS Statis menjadi QRIS Dinamis dengan nominal otomatis.
"""

def crc16_ccitt(data: str) -> str:
    crc = 0xFFFF
    for char in data:
        crc ^= (ord(char) << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def generate_dynamic_qris(static_qris: str, amount: int | float) -> str:
    """
    Mengubah QRIS Statis menjadi Dinamis dengan nominal otomatis.
    """
    qris = static_qris.strip()

    # 1. Buang tag CRC16 lama di akhir string (6304xxxx)
    crc_index = qris.rfind("6304")
    if crc_index != -1 and crc_index >= len(qris) - 8:
        qris = qris[:crc_index]

    # 2. Ubah Tag 01 dari 11 (Statis) ke 12 (Dinamis)
    if "010211" in qris:
        qris = qris.replace("010211", "010212")

    # 3. Format tag 54 (Transaction Amount)
    amount_str = str(int(amount))
    amount_len = f"{len(amount_str):02d}"
    tag54 = f"54{amount_len}{amount_str}"

    # 4. Sisipkan Tag 54 sebelum Tag 58 (Country Code: 5802ID)
    tag58_index = qris.find("5802ID")
    if tag58_index != -1:
        qris = qris[:tag58_index] + tag54 + qris[tag58_index:]
    else:
        qris = qris + tag54

    # 5. Tambahkan prefix Tag 63 (CRC)
    qris_with_crc_tag = qris + "6304"

    # 6. Hitung CRC16 baru
    new_crc = crc16_ccitt(qris_with_crc_tag)

    return qris_with_crc_tag + new_crc


if __name__ == "__main__":
    sample_static = "00020101021126610014COM.GO-JEK.WWW0118936009143831201509021000003010170303UMI51440014ID.CO.QRIS.WWW0215ID10200210000030303UMI5204581253033605802ID5911WARUNG KOPI6007JAKARTA61051234062070703A016304ABCD"
    nominal = 15000
    res = generate_dynamic_qris(sample_static, nominal)
    print("Static :", sample_static)
    print("Dynamic:", res)
    print("Tag 54 berhasil masuk?:", "540515000" in res)
    print("Tag 01 jadi Dinamis (12)?:", "010212" in res)
