'use client';

import { useEffect, useRef, useState } from 'react';

type RegionOption = {
  id: string;
  name: string;
};

type VillageOption = RegionOption & {
  postal_code?: string;
};

type PostalSearchResult = {
  code?: number | string;
  village?: string;
  district?: string;
  regency?: string;
  province?: string;
};

type PostalSearchResponse = {
  data?: PostalSearchResult[];
};

export type IndonesiaAddressValue = {
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postalCode: string;
};

type Props = {
  readOnly?: boolean;
  value: IndonesiaAddressValue;
  onChange: (value: IndonesiaAddressValue) => void;
};

const API_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return (await response.json()) as T;
}

function normalizeText(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

function normalizeRegionName(value: string): string {
  return normalizeText(value)
    .replace(/\b(PROVINSI|PROPINSI|KOTA|KABUPATEN|KAB|KOTA ADMINISTRASI|ADMINISTRASI)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function lookupPostalCodeByAddress(params: {
  village: string;
  district: string;
  city: string;
  province: string;
}): Promise<string> {
  const keyword = encodeURIComponent(params.village);
  const rows = await fetchJson<PostalSearchResponse>(`https://kodepos.vercel.app/search/?q=${keyword}`);
  const data = Array.isArray(rows.data) ? rows.data : [];
  const village = normalizeText(params.village);
  const district = normalizeText(params.district);
  const city = normalizeRegionName(params.city);
  const province = normalizeRegionName(params.province);

  const best = data.find((row) => {
    const rv = normalizeText(String(row.village ?? ''));
    const rd = normalizeText(String(row.district ?? ''));
    const rr = normalizeRegionName(String(row.regency ?? ''));
    const rp = normalizeRegionName(String(row.province ?? ''));
    if (rv !== village) return false;
    if (district && rd !== district) return false;
    if (city && rr && !city.includes(rr) && !rr.includes(city)) return false;
    if (province && rp && !province.includes(rp) && !rp.includes(province)) return false;
    return true;
  });

  if (!best?.code) return '';
  return String(best.code);
}

export default function IndonesiaAddressFields({ readOnly = false, value, onChange }: Props) {
  const [provinces, setProvinces] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<RegionOption[]>([]);
  const [districts, setDistricts] = useState<RegionOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);

  const [provinceId, setProvinceId] = useState('');
  const [cityId, setCityId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [villageId, setVillageId] = useState('');
  const lookupRequestRef = useRef(0);

  useEffect(() => {
    let active = true;
    fetchJson<RegionOption[]>(`${API_BASE}/provinces.json`)
      .then((rows) => {
        if (!active) return;
        setProvinces(rows);
      })
      .catch(() => {
        if (!active) return;
        setProvinces([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const foundProvince = provinces.find((p) => p.name === value.province);
    setProvinceId(foundProvince?.id ?? '');
  }, [provinces, value.province]);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      setCityId('');
      return;
    }
    let active = true;
    fetchJson<RegionOption[]>(`${API_BASE}/regencies/${provinceId}.json`)
      .then((rows) => {
        if (!active) return;
        setCities(rows);
      })
      .catch(() => {
        if (!active) return;
        setCities([]);
      });
    return () => {
      active = false;
    };
  }, [provinceId]);

  useEffect(() => {
    const foundCity = cities.find((c) => c.name === value.city);
    setCityId(foundCity?.id ?? '');
  }, [cities, value.city]);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      setDistrictId('');
      return;
    }
    let active = true;
    fetchJson<RegionOption[]>(`${API_BASE}/districts/${cityId}.json`)
      .then((rows) => {
        if (!active) return;
        setDistricts(rows);
      })
      .catch(() => {
        if (!active) return;
        setDistricts([]);
      });
    return () => {
      active = false;
    };
  }, [cityId]);

  useEffect(() => {
    const foundDistrict = districts.find((d) => d.name === value.district);
    setDistrictId(foundDistrict?.id ?? '');
  }, [districts, value.district]);

  useEffect(() => {
    if (!districtId) {
      setVillages([]);
      setVillageId('');
      return;
    }
    let active = true;
    fetchJson<VillageOption[]>(`${API_BASE}/villages/${districtId}.json`)
      .then((rows) => {
        if (!active) return;
        setVillages(rows);
      })
      .catch(() => {
        if (!active) return;
        setVillages([]);
      });
    return () => {
      active = false;
    };
  }, [districtId]);

  useEffect(() => {
    const foundVillage = villages.find((v) => v.name === value.subdistrict);
    setVillageId(foundVillage?.id ?? '');
  }, [villages, value.subdistrict]);

  const provinceDisabled = readOnly;
  const cityDisabled = readOnly || !provinceId;
  const districtDisabled = readOnly || !cityId;
  const villageDisabled = readOnly || !districtId;

  return (
    <div className="full-row address-grid">
      <div>
        <label htmlFor="md-address-province">Provinsi</label>
        <select
          id="md-address-province"
          disabled={provinceDisabled}
          value={provinceId}
          onChange={(e) => {
            const selected = provinces.find((p) => p.id === e.target.value);
            onChange({
              province: selected?.name ?? '',
              city: '',
              district: '',
              subdistrict: '',
              postalCode: '',
            });
          }}
        >
          <option value="">Pilih provinsi...</option>
          {provinces.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="md-address-city">Kota/Kab</label>
        <select
          id="md-address-city"
          disabled={cityDisabled}
          value={cityId}
          onChange={(e) => {
            const selected = cities.find((c) => c.id === e.target.value);
            onChange({
              province: value.province,
              city: selected?.name ?? '',
              district: '',
              subdistrict: '',
              postalCode: '',
            });
          }}
        >
          <option value="">Pilih kota/kab...</option>
          {cities.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="md-address-district">Kecamatan</label>
        <select
          id="md-address-district"
          disabled={districtDisabled}
          value={districtId}
          onChange={(e) => {
            const selected = districts.find((d) => d.id === e.target.value);
            onChange({
              province: value.province,
              city: value.city,
              district: selected?.name ?? '',
              subdistrict: '',
              postalCode: '',
            });
          }}
        >
          <option value="">Pilih kecamatan...</option>
          {districts.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="md-address-subdistrict">Kelurahan</label>
        <select
          id="md-address-subdistrict"
          disabled={villageDisabled}
          value={villageId}
          onChange={(e) => {
            const selected = villages.find((v) => v.id === e.target.value);
            const localPostal = selected?.postal_code ?? '';
            const nextValue = {
              province: value.province,
              city: value.city,
              district: value.district,
              subdistrict: selected?.name ?? '',
              postalCode: localPostal,
            };
            onChange(nextValue);

            if (!selected || localPostal) return;
            const requestId = lookupRequestRef.current + 1;
            lookupRequestRef.current = requestId;
            lookupPostalCodeByAddress({
              village: selected.name,
              district: value.district,
              city: value.city,
              province: value.province,
            })
              .then((code) => {
                if (!code) return;
                if (lookupRequestRef.current !== requestId) return;
                onChange({
                  ...nextValue,
                  postalCode: code,
                });
              })
              .catch(() => {
                // Fallback silently: kodepos tetap dapat diisi manual jika lookup gagal.
              });
          }}
        >
          <option value="">Pilih kelurahan...</option>
          {villages.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="md-address-postal">Kodepos</label>
        <input id="md-address-postal" value={value.postalCode} readOnly placeholder="Otomatis dari kelurahan" />
      </div>
    </div>
  );
}
